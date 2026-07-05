import { test, expect, vi } from 'vitest'
import { validateEnv } from './env-validate'

const SECRET = 'x'.repeat(32)
const ok = { BETTER_AUTH_SECRET: SECRET, BETTER_AUTH_URL: 'https://app.example.com' }

test('a minimal valid env has no errors or warnings', () => {
  expect(validateEnv(ok)).toEqual({ errors: [], warnings: [] })
})

test('missing core vars are errors', () => {
  const r = validateEnv({})
  expect(r.errors).toEqual(
    expect.arrayContaining([
      expect.stringContaining('BETTER_AUTH_SECRET'),
      expect.stringContaining('BETTER_AUTH_URL'),
    ]),
  )
})

test('short secret and bad url are errors', () => {
  const r = validateEnv({ BETTER_AUTH_SECRET: 'tooshort', BETTER_AUTH_URL: 'not a url' })
  expect(r.errors).toEqual(
    expect.arrayContaining([
      expect.stringContaining('at least 32'),
      expect.stringContaining('valid absolute URL'),
    ]),
  )
})

test('half an OAuth pair is an error; a full pair is fine', () => {
  expect(validateEnv({ ...ok, GOOGLE_CLIENT_ID: 'id' }).errors).toEqual([
    expect.stringContaining('Google OAuth'),
  ])
  expect(validateEnv({ ...ok, GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 's' }).errors).toEqual([])
})

test('half a Turnstile pair is an error; a full pair is fine', () => {
  expect(validateEnv({ ...ok, TURNSTILE_SITE_KEY: 'k' }).errors).toEqual([
    expect.stringContaining('Turnstile'),
  ])
  expect(validateEnv({ ...ok, TURNSTILE_SITE_KEY: 'k', TURNSTILE_SECRET_KEY: 's' }).errors).toEqual([])
})

test('Stripe key without webhook secret is an error; missing price ids warn', () => {
  const r = validateEnv({ ...ok, STRIPE_SECRET_KEY: 'sk_test' })
  expect(r.errors).toEqual([expect.stringContaining('STRIPE_WEBHOOK_SECRET')])
  expect(r.warnings).toEqual([expect.stringContaining('STRIPE_PRICE_PRO_')])
})

test('assertEnvOnce keeps throwing on EVERY call while the env is invalid', async () => {
  // Regression: the memo flag must not be set before validation, or only the
  // first request per isolate fails and the rest serve with a broken env.
  vi.resetModules()
  vi.doMock('./env', () => ({ env: {} })) // missing all core vars → hard errors
  const { assertEnvOnce } = await import('./env-validate')
  await expect(assertEnvOnce()).rejects.toThrow('Invalid environment configuration')
  await expect(assertEnvOnce()).rejects.toThrow('Invalid environment configuration')
  vi.doUnmock('./env')
})

test('assertEnvOnce passes and memoizes on a valid env', async () => {
  vi.resetModules()
  vi.doMock('./env', () => ({ env: { BETTER_AUTH_SECRET: SECRET, BETTER_AUTH_URL: 'https://app.example.com' } }))
  const { assertEnvOnce } = await import('./env-validate')
  await expect(assertEnvOnce()).resolves.toBeUndefined()
  await expect(assertEnvOnce()).resolves.toBeUndefined()
  vi.doUnmock('./env')
})

test('Stripe fully configured is clean', () => {
  const r = validateEnv({
    ...ok,
    STRIPE_SECRET_KEY: 'sk_test',
    STRIPE_WEBHOOK_SECRET: 'whsec',
    STRIPE_PRICE_PRO_MONTHLY: 'price_123',
  })
  expect(r).toEqual({ errors: [], warnings: [] })
})
