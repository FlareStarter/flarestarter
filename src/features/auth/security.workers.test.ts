/**
 * Auth security middleware tests — real D1 (miniflare), via auth.handler so the
 * onRequest middlewares (rate limit, captcha) actually run.
 *
 * Intents:
 *  1. Per-IP rate limiting throttles repeated sign-ins (built-in 3/10s rule).
 *  2. Turnstile captcha blocks requests with no x-captcha-response token.
 */
import { test, expect, beforeAll } from 'vitest'
import { env } from 'cloudflare:test'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { captcha } from 'better-auth/plugins'
import { createDb } from '@/db/client'
import * as schema from './auth.schema'
import { applyAuthSchema } from './test-helpers'

beforeAll(async () => {
  await applyAuthSchema(env.DB)
  // rateLimit table (storage: 'database') — mirrors migration 0005.
  await env.DB.prepare(
    'CREATE TABLE IF NOT EXISTS "rateLimit" ("id" TEXT PRIMARY KEY NOT NULL, "key" TEXT, "count" INTEGER, "last_request" INTEGER)',
  ).run()
})

function buildAuth(extra: Record<string, unknown>) {
  return betterAuth({
    secret: 'test-secret-for-vitest-only-32-chars!!',
    baseURL: 'http://localhost',
    database: drizzleAdapter(createDb(env.DB), { provider: 'sqlite', schema }),
    emailAndPassword: { enabled: true },
    advanced: { ipAddress: { ipAddressHeaders: ['cf-connecting-ip'] } },
    ...extra,
  })
}

function signInReq(ip: string, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/auth/sign-in/email', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip, ...headers },
    body: JSON.stringify({ email: 'nobody@example.com', password: 'wrong-password-123' }),
  })
}

test('per-IP rate limiting: the 4th sign-in within the window is 429', async () => {
  const auth = buildAuth({ rateLimit: { enabled: true, storage: 'database' } })
  const codes: number[] = []
  for (let i = 0; i < 4; i++) {
    codes.push((await auth.handler(signInReq('203.0.113.10'))).status)
  }
  expect(codes.slice(0, 3).every((c) => c !== 429)).toBe(true) // first 3 allowed (401)
  expect(codes[3]).toBe(429) // 4th throttled
})

test('rate limiting is keyed per IP — a different IP is unaffected', async () => {
  const auth = buildAuth({ rateLimit: { enabled: true, storage: 'database' } })
  for (let i = 0; i < 4; i++) await auth.handler(signInReq('203.0.113.20'))
  // fresh IP starts its own bucket
  expect((await auth.handler(signInReq('203.0.113.21'))).status).not.toBe(429)
})

test('Turnstile captcha: sign-in with no token is rejected (400 MISSING_RESPONSE)', async () => {
  const auth = buildAuth({
    plugins: [captcha({ provider: 'cloudflare-turnstile', secretKey: 'test-secret' })],
  })
  const res = await auth.handler(signInReq('198.51.100.1'))
  expect(res.status).toBe(400)
  const body = (await res.json()) as { code?: string }
  expect(body.code).toBe('MISSING_RESPONSE')
})
