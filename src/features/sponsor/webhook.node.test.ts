import { describe, test, expect } from 'vitest'
import type Stripe from 'stripe'
import { translateSponsorEvent, isExclusiveSponsorEvent } from './webhook'

function evt(type: string, object: Record<string, unknown>): Stripe.Event {
  return { id: 'evt_1', type, data: { object } } as unknown as Stripe.Event
}

describe('translateSponsorEvent · checkout.session.completed', () => {
  test('一次性赞助 → created（含 paymentIntentId）', () => {
    const ev = translateSponsorEvent(evt('checkout.session.completed', {
      object: 'checkout.session', id: 'cs_1', mode: 'payment', payment_status: 'paid', amount_total: 2500, currency: 'usd',
      customer_details: { email: 'a@example.com' }, subscription: null, payment_intent: 'pi_1',
      metadata: { type: 'sponsorship', mode: 'once', github: 'octocat', message: 'love it' },
    }))
    expect(ev).toEqual({
      type: 'created',
      record: {
        id: 'cs_1', email: 'a@example.com', amount: 2500, currency: 'usd', mode: 'once',
        stripeSessionId: 'cs_1', stripeSubscriptionId: null, stripePaymentIntentId: 'pi_1',
        status: 'completed', github: 'octocat', message: 'love it',
      },
    })
  })
  test('月度赞助 → created（status active，subscription id）', () => {
    const ev = translateSponsorEvent(evt('checkout.session.completed', {
      object: 'checkout.session', id: 'cs_2', mode: 'subscription', payment_status: 'paid', amount_total: 500, currency: 'usd',
      customer_details: { email: 'b@example.com' }, subscription: 'sub_1', payment_intent: null,
      metadata: { type: 'sponsorship', mode: 'monthly', github: 'hubber' },
    }))
    expect(ev).toEqual({
      type: 'created',
      record: {
        id: 'cs_2', email: 'b@example.com', amount: 500, currency: 'usd', mode: 'recurring',
        stripeSessionId: 'cs_2', stripeSubscriptionId: 'sub_1', stripePaymentIntentId: null,
        status: 'active', github: 'hubber', message: null,
      },
    })
  })
  test('非 sponsorship metadata → null', () => {
    expect(translateSponsorEvent(evt('checkout.session.completed', {
      object: 'checkout.session', id: 'cs_3', mode: 'payment', metadata: {},
    }))).toBeNull()
  })
  test('延迟到账（payment_status=unpaid）→ null：未到账不上墙', () => {
    expect(translateSponsorEvent(evt('checkout.session.completed', {
      object: 'checkout.session', id: 'cs_4', mode: 'payment', payment_status: 'unpaid', amount_total: 2500, currency: 'usd',
      customer_details: { email: 'a@example.com' }, payment_intent: 'pi_4',
      metadata: { type: 'sponsorship', mode: 'once' },
    }))).toBeNull()
  })
  test('async_payment_succeeded（到账重放）→ created', () => {
    const ev = translateSponsorEvent(evt('checkout.session.async_payment_succeeded', {
      object: 'checkout.session', id: 'cs_5', mode: 'payment', payment_status: 'paid', amount_total: 2500, currency: 'usd',
      customer_details: { email: 'a@example.com' }, subscription: null, payment_intent: 'pi_5',
      metadata: { type: 'sponsorship', mode: 'once' },
    }))
    expect(ev?.type).toBe('created')
    expect(ev && 'record' in ev ? ev.record.stripeSessionId : null).toBe('cs_5')
  })
})

describe('translateSponsorEvent · invoice.paid（续费入账）', () => {
  const baseInvoice = {
    object: 'invoice', id: 'in_2', amount_paid: 500, currency: 'usd', customer_email: 'b@example.com',
    billing_reason: 'subscription_cycle',
    parent: { type: 'subscription_details', subscription_details: {
      subscription: 'sub_1', metadata: { type: 'sponsorship', mode: 'monthly', github: 'hubber', message: 'go go' },
    } },
  }
  test('续费期 → renewed（id=invoice id，github/message 取订阅 metadata）', () => {
    expect(translateSponsorEvent(evt('invoice.paid', baseInvoice))).toEqual({
      type: 'renewed',
      record: {
        id: 'in_2', email: 'b@example.com', amount: 500, currency: 'usd', mode: 'recurring',
        stripeSessionId: 'in_2', stripeSubscriptionId: 'sub_1', stripePaymentIntentId: null,
        status: 'completed', github: 'hubber', message: 'go go',
      },
    })
  })
  test('首期（billing_reason=subscription_create）→ null，避免与 checkout 记录重复', () => {
    expect(translateSponsorEvent(evt('invoice.paid', { ...baseInvoice, billing_reason: 'subscription_create' }))).toBeNull()
  })
  test('非 sponsorship 订阅的 invoice → null', () => {
    expect(translateSponsorEvent(evt('invoice.paid', {
      ...baseInvoice,
      parent: { type: 'subscription_details', subscription_details: { subscription: 'sub_x', metadata: {} } },
    }))).toBeNull()
  })
})

describe('translateSponsorEvent · 下墙事件', () => {
  test('customer.subscription.deleted（sponsorship metadata）→ canceled', () => {
    expect(translateSponsorEvent(evt('customer.subscription.deleted', {
      object: 'subscription', id: 'sub_1', metadata: { type: 'sponsorship' },
    }))).toEqual({ type: 'canceled', subscriptionId: 'sub_1' })
  })
  test('customer.subscription.deleted（billing 自己的订阅）→ null', () => {
    expect(translateSponsorEvent(evt('customer.subscription.deleted', {
      object: 'subscription', id: 'sub_pro', metadata: {},
    }))).toBeNull()
  })
  test('charge.refunded 全额退款 → refunded（无 metadata 校验，靠 DB 匹配过滤）', () => {
    expect(translateSponsorEvent(evt('charge.refunded', {
      object: 'charge', id: 'ch_1', payment_intent: 'pi_1', refunded: true, amount: 2500, amount_refunded: 2500,
    }))).toEqual({ type: 'refunded', paymentIntentId: 'pi_1' })
  })
  test('charge.refunded 部分退款 → null（善意退一部分不抹掉整笔赞助）', () => {
    expect(translateSponsorEvent(evt('charge.refunded', {
      object: 'charge', id: 'ch_p', payment_intent: 'pi_p', refunded: false, amount: 30000, amount_refunded: 2000,
    }))).toBeNull()
  })
  test('charge.dispute.created → disputed', () => {
    expect(translateSponsorEvent(evt('charge.dispute.created', {
      object: 'dispute', id: 'dp_1', payment_intent: 'pi_1',
    }))).toEqual({ type: 'disputed', paymentIntentId: 'pi_1' })
  })
  test('charge.refunded 无 payment_intent → null', () => {
    expect(translateSponsorEvent(evt('charge.refunded', { object: 'charge', id: 'ch_2', payment_intent: null }))).toBeNull()
  })
  test('无关事件 → null', () => {
    expect(translateSponsorEvent(evt('invoice.created', { object: 'invoice', id: 'in_9' }))).toBeNull()
  })
})

describe('isExclusiveSponsorEvent', () => {
  test('created/renewed/canceled 独占；refunded/disputed 与 billing 共享', () => {
    const rec = {} as never
    expect(isExclusiveSponsorEvent({ type: 'created', record: rec })).toBe(true)
    expect(isExclusiveSponsorEvent({ type: 'renewed', record: rec })).toBe(true)
    expect(isExclusiveSponsorEvent({ type: 'canceled', subscriptionId: 's' })).toBe(true)
    expect(isExclusiveSponsorEvent({ type: 'refunded', paymentIntentId: 'p' })).toBe(false)
    expect(isExclusiveSponsorEvent({ type: 'disputed', paymentIntentId: 'p' })).toBe(false)
  })
})
