/**
 * Test helpers for auth integration tests.
 *
 * Provides:
 * - applyAuthSchema: creates all auth + feedback tables in test D1
 * - createTestAuth: betterAuth instance that captures sent emails (no real SMTP)
 */
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin } from 'better-auth/plugins'
import type { DB } from '@/db/client'
import { isAdminEmail } from '@/features/admin/is-admin'
import * as schema from './auth.schema'

// ---------------------------------------------------------------------------
// Auth env for tests — secret/URL are arbitrary but required by better-auth
// ---------------------------------------------------------------------------
const TEST_AUTH_ENV = {
  BETTER_AUTH_SECRET: 'test-secret-for-vitest-only-32-chars!!',
  BETTER_AUTH_URL: 'http://localhost',
}

// ---------------------------------------------------------------------------
// Schema bootstrap: run all CREATE TABLE statements against the test D1.
// We use IF NOT EXISTS so this is safe to call multiple times.
// Statements extracted from drizzle/0001_complex_lady_vermin.sql
// ---------------------------------------------------------------------------
export async function applyAuthSchema(db: D1Database): Promise<void> {
  const stmts = [
    // feedback (with FK to user, cascade delete)
    `CREATE TABLE IF NOT EXISTS "feedback" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "user_id" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "body" TEXT NOT NULL DEFAULT '',
      "status" TEXT NOT NULL DEFAULT 'open',
      "admin_note" TEXT,
      "created_at" INTEGER NOT NULL,
      "updated_at" INTEGER NOT NULL,
      FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE
    )`,
    // user (includes admin plugin columns: role, banned, ban_reason, ban_expires)
    `CREATE TABLE IF NOT EXISTS "user" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL UNIQUE,
      "email_verified" INTEGER DEFAULT 0 NOT NULL,
      "image" TEXT,
      "created_at" INTEGER DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
      "updated_at" INTEGER DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
      "role" TEXT,
      "banned" INTEGER DEFAULT false,
      "ban_reason" TEXT,
      "ban_expires" INTEGER
    )`,
    // session (includes admin plugin column: impersonated_by)
    `CREATE TABLE IF NOT EXISTS "session" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "expires_at" INTEGER NOT NULL,
      "token" TEXT NOT NULL UNIQUE,
      "created_at" INTEGER DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
      "updated_at" INTEGER NOT NULL,
      "ip_address" TEXT,
      "user_agent" TEXT,
      "user_id" TEXT NOT NULL,
      "impersonated_by" TEXT,
      FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE
    )`,
    // account
    `CREATE TABLE IF NOT EXISTS "account" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "account_id" TEXT NOT NULL,
      "provider_id" TEXT NOT NULL,
      "user_id" TEXT NOT NULL,
      "access_token" TEXT,
      "refresh_token" TEXT,
      "id_token" TEXT,
      "access_token_expires_at" INTEGER,
      "refresh_token_expires_at" INTEGER,
      "scope" TEXT,
      "password" TEXT,
      "created_at" INTEGER DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
      "updated_at" INTEGER NOT NULL,
      FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE
    )`,
    // verification
    `CREATE TABLE IF NOT EXISTS "verification" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "identifier" TEXT NOT NULL,
      "value" TEXT NOT NULL,
      "expires_at" INTEGER NOT NULL,
      "created_at" INTEGER DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
      "updated_at" INTEGER DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
    )`,
  ]

  for (const sql of stmts) {
    await db.prepare(sql).run()
  }
}

// ---------------------------------------------------------------------------
// Captured email shape
// ---------------------------------------------------------------------------
interface CapturedEmail {
  to: string
  url: string
}

// ---------------------------------------------------------------------------
// createTestAuth — same config as createAuth but email hooks push to array.
// Pass adminEmails (comma-separated) to wire the bootstrap databaseHook that
// assigns role='admin' on sign-up for matching emails (same logic as production).
// ---------------------------------------------------------------------------
export function createTestAuth(db: DB, adminEmails?: string) {
  const sentEmails: CapturedEmail[] = []

  const auth = betterAuth({
    secret: TEST_AUTH_ENV.BETTER_AUTH_SECRET,
    baseURL: TEST_AUTH_ENV.BETTER_AUTH_URL,
    database: drizzleAdapter(db, { provider: 'sqlite', schema }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }) => {
        sentEmails.push({ to: user.email, url })
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendVerificationEmail: async ({ user, url }) => {
        sentEmails.push({ to: user.email, url })
      },
    },
    session: { cookieCache: { enabled: true, maxAge: 5 * 60 } },
    user: { deleteUser: { enabled: true } },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => ({
            data: {
              ...user,
              role: isAdminEmail(user.email, adminEmails) ? 'admin' : 'user',
            },
          }),
        },
      },
    },
    plugins: [admin()],
    // No tanstackStartCookies plugin in test — it tries to import @tanstack/react-start-server
  })

  return { auth, sentEmails }
}

// ---------------------------------------------------------------------------
// extractToken — parse token from a better-auth URL.
// Supports two formats:
//   - Query param:  .../verify-email?token=XYZ
//   - Path segment: .../reset-password/XYZ?callbackURL=...
// ---------------------------------------------------------------------------
export function extractToken(url: string): string {
  const u = new URL(url)
  // Try query param first (email verification)
  const queryToken = u.searchParams.get('token')
  if (queryToken) return queryToken
  // Fall back to last path segment (password reset: /reset-password/{token})
  const segments = u.pathname.split('/').filter(Boolean)
  const last = segments[segments.length - 1]
  if (last && last !== 'reset-password') return last
  throw new Error(`No token in URL: ${url}`)
}

// ---------------------------------------------------------------------------
// extractCookie — get the Set-Cookie header value from a Response
// ---------------------------------------------------------------------------
export function extractCookie(response: Response): string {
  // better-auth may set multiple cookies; join them for subsequent requests
  const setCookie = response.headers.get('set-cookie')
  if (!setCookie) throw new Error('No Set-Cookie header on response')
  return setCookie
}
