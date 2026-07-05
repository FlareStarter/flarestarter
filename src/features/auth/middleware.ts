/**
 * Server-side auth utilities for route loaders and server functions.
 *
 * `requireUser()` returns `{ id, email }` where `id` is the user_id.
 * Business code should pass `id` to `scopeFromUser(id)` from `@/db/scope`
 * and use `ownedBy` / `withOwner` — never hand-write user filters.
 */
import { createServerFn } from '@tanstack/react-start'
import { redirect } from '@tanstack/react-router'
import { env } from '@/lib/env'
import { readUser } from './readUser.server'

export const getOptionalUser = createServerFn({ method: 'GET' }).handler(
  async (): Promise<{ id: string; email: string } | null> => readUser(),
)

export const requireUser = createServerFn({ method: 'GET' })
  // locale 由调用方（路由 loader 的 params）传入：server fn 在客户端导航时经 RPC 调用，
  // 无法从请求 URL 推断页面语言；不带 params 的 '/{-$locale}/login' 会恒定跳到英文登录页。
  .inputValidator((d?: { locale?: string }) => ({ locale: d?.locale === 'zh' ? ('zh' as const) : undefined }))
  .handler(async ({ data }) => {
    const user = await readUser()
    if (!user) throw redirect({ to: '/{-$locale}/login', params: { locale: data?.locale } })
    return user
  })

export const getEnabledSocialProviders = createServerFn({ method: 'GET' }).handler(async () => {
  const out: Array<'google' | 'github'> = []
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) out.push('google')
  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) out.push('github')
  return out
})

/** Public Turnstile site key for the auth forms, or null when bot protection is off. */
export const getTurnstileSiteKey = createServerFn({ method: 'GET' }).handler(
  async (): Promise<string | null> => env.TURNSTILE_SITE_KEY || null,
)
