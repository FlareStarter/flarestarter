import { test, expect, vi, afterEach } from 'vitest'
import { withSecurityHeaders } from './security-headers'

afterEach(() => vi.unstubAllEnvs())

const BASE = [
  'x-content-type-options',
  'x-frame-options',
  'referrer-policy',
  'permissions-policy',
  'strict-transport-security',
]

test('adds the baseline security headers and preserves status + body', async () => {
  const res = withSecurityHeaders(new Response('hello', { status: 200 }))
  for (const h of BASE) expect(res.headers.get(h)).toBeTruthy()
  expect(res.headers.get('x-frame-options')).toBe('DENY')
  expect(res.status).toBe(200)
  expect(await res.text()).toBe('hello')
})

test('CSP is omitted in dev (PROD=false)', () => {
  vi.stubEnv('PROD', false)
  const res = withSecurityHeaders(new Response('x'))
  expect(res.headers.get('content-security-policy')).toBeNull()
})

test('CSP is set in production and allows Turnstile/analytics', () => {
  vi.stubEnv('PROD', true)
  const csp = withSecurityHeaders(new Response('x')).headers.get('content-security-policy')
  expect(csp).toContain("default-src 'self'")
  expect(csp).toContain('https://challenges.cloudflare.com') // Turnstile
  expect(csp).toContain('https://static.cloudflareinsights.com') // Web Analytics
  expect(csp).not.toContain('fonts.googleapis.com') // fonts are self-hosted
  expect(csp).not.toContain('fonts.gstatic.com')
  expect(csp).toContain("frame-ancestors 'none'")
})

test('protocol upgrades (101 / websocket) pass through untouched', () => {
  // A real 101 Response can't be constructed in undici, and a CF websocket
  // response carries a `webSocket` field — mock both shapes the guard checks.
  const status101 = { status: 101 } as unknown as Response
  expect(withSecurityHeaders(status101)).toBe(status101) // returned as-is
  const wsResponse = { status: 200, webSocket: {} } as unknown as Response
  expect(withSecurityHeaders(wsResponse)).toBe(wsResponse)
})

test('does not clobber a Content-Security-Policy already set', () => {
  vi.stubEnv('PROD', true)
  const res = withSecurityHeaders(
    new Response('x', { headers: { 'content-security-policy': "default-src 'none'" } }),
  )
  expect(res.headers.get('content-security-policy')).toBe("default-src 'none'")
})
