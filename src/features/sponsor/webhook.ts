import type Stripe from 'stripe'

export interface SponsorRecord {
  id: string
  email: string | null
  amount: number
  currency: string
  mode: 'once' | 'recurring'
  stripeSessionId: string
  stripeSubscriptionId: string | null
  stripePaymentIntentId: string | null
  status: 'completed' | 'active'
  github: string | null
  message: string | null
}

/**
 * Sponsorship domain events, translated from Stripe webhooks (pure — node-testable).
 * created/renewed/canceled are verifiably ours (checkout/subscription metadata carries
 * type=sponsorship) and are handled exclusively. refunded/disputed cannot be verified
 * from the Charge/Dispute object alone, so they are emitted for EVERY such event and
 * matched in the DB by payment intent id — the same events must still flow to billing
 * (lifetime-purchase refunds consume charge.refunded too).
 */
export type SponsorEvent =
  | { type: 'created'; record: SponsorRecord }
  | { type: 'renewed'; record: SponsorRecord }
  | { type: 'canceled'; subscriptionId: string }
  | { type: 'refunded'; paymentIntentId: string }
  | { type: 'disputed'; paymentIntentId: string }

export function isExclusiveSponsorEvent(ev: SponsorEvent): boolean {
  return ev.type === 'created' || ev.type === 'renewed' || ev.type === 'canceled'
}

export function translateSponsorEvent(event: Stripe.Event): SponsorEvent | null {
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const s = event.data.object as Stripe.Checkout.Session
      if (s.metadata?.type !== 'sponsorship') return null
      // 延迟到账支付（ACH/SEPA 等）：completed 时 payment_status 仍是 unpaid——未到账的赞助
      // 不上墙、不记累计额；到账后 Stripe 重放 async_payment_succeeded（同一翻译）。
      if (s.payment_status !== 'paid') return null
      const recurring = s.mode === 'subscription'
      const subId = typeof s.subscription === 'string' ? s.subscription : (s.subscription?.id ?? null)
      const piId = typeof s.payment_intent === 'string' ? s.payment_intent : (s.payment_intent?.id ?? null)
      return {
        type: 'created',
        record: {
          id: s.id,
          email: s.customer_details?.email ?? s.customer_email ?? null,
          amount: s.amount_total ?? 0,
          currency: s.currency ?? 'usd',
          mode: recurring ? 'recurring' : 'once',
          stripeSessionId: s.id,
          stripeSubscriptionId: subId,
          stripePaymentIntentId: piId,
          status: recurring ? 'active' : 'completed',
          github: (s.metadata?.github ?? null) || null,
          message: (s.metadata?.message ?? null) || null,
        },
      }
    }
    case 'invoice.paid': {
      const inv = event.data.object as Stripe.Invoice
      const sd = inv.parent?.subscription_details
      if (sd?.metadata?.type !== 'sponsorship') return null
      // the first invoice is already recorded via checkout.session.completed
      if (inv.billing_reason === 'subscription_create') return null
      const subId = typeof sd.subscription === 'string' ? sd.subscription : sd.subscription.id
      return {
        type: 'renewed',
        record: {
          id: inv.id,
          email: inv.customer_email ?? null,
          amount: inv.amount_paid,
          currency: inv.currency,
          mode: 'recurring',
          stripeSessionId: inv.id, // unique per invoice — reuses the idempotency column
          stripeSubscriptionId: subId,
          // Known limitation: recurring payments carry no PI here (Stripe v22 moved
          // invoice PIs into `invoice.payments`), so refunds/disputes on MONTHLY
          // payments are not auto-matched — admin hide is the fallback. Follow-up:
          // capture PIs via invoice.payments expansion or a Charge→invoice lookup.
          stripePaymentIntentId: null,
          status: 'completed',
          github: (sd.metadata?.github ?? null) || null,
          message: (sd.metadata?.message ?? null) || null,
        },
      }
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      if (sub.metadata?.type !== 'sponsorship') return null
      return { type: 'canceled', subscriptionId: sub.id }
    }
    case 'charge.refunded': {
      const ch = event.data.object as Stripe.Charge
      // Partial (goodwill) refunds keep the sponsorship on the wall — only a full
      // refund voids it (mirrors the billing-side check in entitlement.ts).
      if (!ch.refunded && ch.amount_refunded !== ch.amount) return null
      const pi = typeof ch.payment_intent === 'string' ? ch.payment_intent : (ch.payment_intent?.id ?? null)
      return pi ? { type: 'refunded', paymentIntentId: pi } : null
    }
    case 'charge.dispute.created': {
      const dp = event.data.object as Stripe.Dispute
      const pi = typeof dp.payment_intent === 'string' ? dp.payment_intent : (dp.payment_intent?.id ?? null)
      return pi ? { type: 'disputed', paymentIntentId: pi } : null
    }
    default:
      return null
  }
}
