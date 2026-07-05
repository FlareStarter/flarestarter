/** runBillingHooks integration tests — real D1, injected hooks (no email sent). */
import { describe, test, expect, beforeAll } from 'vitest'
import { env } from 'cloudflare:test'
import { createDb } from '@/db/client'
import { runBillingHooks, type BillingHooks } from './hooks'
import { applyBillingSchema, seedUserAndSubscription } from './test-helpers'

beforeAll(async () => {
  await applyBillingSchema(env.DB)
})

describe('runBillingHooks', () => {
  test('activated → calls onProActivated with the resolved user email + via', async () => {
    const db = createDb(env.DB)
    const userId = `hk-${crypto.randomUUID()}`
    await seedUserAndSubscription(db, { userId, email: 'ada@analytical.io', customerId: `cus_hk_${crypto.randomUUID().slice(0, 8)}` })
    const calls: Array<{ email: string; via: string }> = []
    const hooks: BillingHooks = { async onProActivated(ctx, via) { calls.push({ email: ctx.email, via }) } }
    await runBillingHooks(db, { kind: 'activated', userId, via: 'lifetime' }, hooks)
    expect(calls).toEqual([{ email: 'ada@analytical.io', via: 'lifetime' }])
  })

  test('deactivated → calls onProDeactivated with the reason', async () => {
    const db = createDb(env.DB)
    const userId = `hk-d-${crypto.randomUUID()}`
    await seedUserAndSubscription(db, { userId, email: 'g@navy.mil', customerId: `cus_hkd_${crypto.randomUUID().slice(0, 8)}` })
    const reasons: string[] = []
    const hooks: BillingHooks = { async onProDeactivated(_ctx, reason) { reasons.push(reason) } }
    await runBillingHooks(db, { kind: 'deactivated', userId, reason: 'refunded' }, hooks)
    expect(reasons).toEqual(['refunded'])
  })

  test('payment_failed → calls onPaymentFailed with the resolved user email', async () => {
    const db = createDb(env.DB)
    const userId = `hk-pf-${crypto.randomUUID()}`
    await seedUserAndSubscription(db, { userId, email: 'pf@billing.io', customerId: `cus_hkpf_${crypto.randomUUID().slice(0, 8)}` })
    const emails: string[] = []
    const hooks: BillingHooks = { async onPaymentFailed(ctx) { emails.push(ctx.email) } }
    await runBillingHooks(db, { kind: 'payment_failed', userId }, hooks)
    expect(emails).toEqual(['pf@billing.io'])
  })

  test('a throwing hook is swallowed (runBillingHooks never rejects)', async () => {
    const db = createDb(env.DB)
    const userId = `hk-e-${crypto.randomUUID()}`
    await seedUserAndSubscription(db, { userId, email: 'x@x.io', customerId: `cus_hke_${crypto.randomUUID().slice(0, 8)}` })
    const hooks: BillingHooks = { async onProActivated() { throw new Error('hook boom') } }
    await expect(runBillingHooks(db, { kind: 'activated', userId, via: 'lifetime' }, hooks)).resolves.toBeUndefined()
  })

  test('unknown user (no email) → hook is skipped, no throw', async () => {
    const db = createDb(env.DB)
    const hooks: BillingHooks = { async onProActivated() { throw new Error('should not be called') } }
    await expect(runBillingHooks(db, { kind: 'activated', userId: 'nonexistent', via: 'lifetime' }, hooks)).resolves.toBeUndefined()
  })
})
