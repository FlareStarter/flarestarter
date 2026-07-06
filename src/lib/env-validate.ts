/**
 * Fail-fast environment validation via a zod schema.
 *
 * The schema is the single source of truth for what a valid env looks like;
 * `Env` is inferred from it, so the shape and the types never drift. Conditional
 * rules (OAuth pairs, Stripe webhook secret) live in `superRefine`. Soft advice
 * that shouldn't block startup (e.g. Stripe key but no price ids) is returned as
 * `warnings`, since zod issues are all hard errors.
 *
 * `validateEnv` is pure (unit-tested in the node pool); `assertEnvOnce` runs it
 * once per isolate from the server entry — `env` is imported lazily there so the
 * pure path stays importable where `cloudflare:workers` can't resolve.
 */
import { z } from 'zod'

/** Wrangler declares unset vars as "" — treat empty/whitespace as absent. */
const optional = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().optional(),
)

const envSchema = z
  .object({
    // Core — the app cannot function without these.
    BETTER_AUTH_SECRET: z
      .string({ error: 'BETTER_AUTH_SECRET is required' })
      .min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),
    BETTER_AUTH_URL: z.url({ error: 'BETTER_AUTH_URL must be a valid absolute URL' }),

    RESEND_API_KEY: optional,
    RESEND_AUDIENCE_ID: optional,
    EMAIL_FROM: optional,
    GOOGLE_CLIENT_ID: optional,
    GOOGLE_CLIENT_SECRET: optional,
    GITHUB_CLIENT_ID: optional,
    GITHUB_CLIENT_SECRET: optional,
    STRIPE_SECRET_KEY: optional,
    STRIPE_WEBHOOK_SECRET: optional,
    STRIPE_PRICE_PRO_MONTHLY: optional,
    STRIPE_PRICE_PRO_YEARLY: optional,
    STRIPE_PRICE_PRO_LIFETIME: optional,
    ADMIN_EMAILS: optional,
    TURNSTILE_SITE_KEY: optional,
    TURNSTILE_SECRET_KEY: optional,
    CF_ANALYTICS_TOKEN: optional,
    SENTRY_DSN: optional,
  })
  .superRefine((env, ctx) => {
    // OAuth: half a pair is always a misconfiguration.
    const pair = (a: keyof typeof env, b: keyof typeof env, label: string) => {
      if (!!env[a] !== !!env[b]) {
        ctx.addIssue({ code: 'custom', path: [a], message: `${label}: set both ${a} and ${b}, or neither` })
      }
    }
    pair('GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'Google OAuth')
    pair('GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'GitHub OAuth')
    pair('TURNSTILE_SITE_KEY', 'TURNSTILE_SECRET_KEY', 'Turnstile')

    // A Stripe secret key with no webhook secret means webhooks fail signature
    // verification silently.
    if (env.STRIPE_SECRET_KEY && !env.STRIPE_WEBHOOK_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['STRIPE_WEBHOOK_SECRET'],
        message: 'STRIPE_WEBHOOK_SECRET is required when STRIPE_SECRET_KEY is set',
      })
    }
  })

/** Fully-validated env. Required fields are non-optional here. */
export type Env = z.infer<typeof envSchema>

export interface EnvReport {
  errors: string[]
  warnings: string[]
}

/** Validate raw env. Returns hard `errors` (block startup) and soft `warnings`. */
export function validateEnv(raw: Record<string, string | undefined>): EnvReport {
  const result = envSchema.safeParse(raw)
  const errors = result.success
    ? []
    : result.error.issues.map((i) => i.message)

  // Soft advice — never blocks startup.
  const warnings: string[] = []
  const has = (k: string) => typeof raw[k] === 'string' && raw[k]!.trim() !== ''
  if (
    has('STRIPE_SECRET_KEY') &&
    !has('STRIPE_PRICE_PRO_MONTHLY') &&
    !has('STRIPE_PRICE_PRO_YEARLY') &&
    !has('STRIPE_PRICE_PRO_LIFETIME')
  ) {
    warnings.push('STRIPE_SECRET_KEY is set but no STRIPE_PRICE_PRO_* price ids — checkout will be unavailable')
  }

  return { errors, warnings }
}

let checked = false

/** Validate the live env once per isolate. Warns on soft issues, throws on hard ones. */
export async function assertEnvOnce(): Promise<void> {
  if (checked) return
  const { env } = await import('./env')
  const raw = env as unknown as Record<string, string | undefined>
  const { errors, warnings } = validateEnv(raw)
  for (const w of warnings) console.warn(`[env] ${w}`)
  // Deployed build (staging/prod) without Resend: email verification is turned
  // off (auth.server.ts `requireEmailVerification`) and password-reset links
  // can't be delivered — an account-ownership gap. We degrade per the "missing
  // key → feature off" convention, but never silently on a real deployment.
  // `import.meta.env.PROD` is true for any built worker, false under `pnpm dev`.
  if (import.meta.env.PROD && !raw.RESEND_API_KEY?.trim()) {
    console.warn(
      '[env] ⚠️ RESEND_API_KEY is not set in a deployed build — email verification is OFF ' +
        'and password-reset emails cannot be delivered. Set RESEND_API_KEY (+ EMAIL_FROM) ' +
        'for any real production deployment.',
    )
  }
  if (errors.length) {
    throw new Error(`Invalid environment configuration:\n${errors.map((e) => `  - ${e}`).join('\n')}`)
  }
  // Memoize only after success — a misconfigured isolate must fail on EVERY request, not just the first.
  checked = true
}
