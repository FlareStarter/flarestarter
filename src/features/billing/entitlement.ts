import type Stripe from 'stripe'

export type Plan = 'free' | 'pro'
export interface Entitlement { plan: Plan; status: string; isActive: boolean; currentPeriodEnd: number | null; lifetime: boolean; paymentFailed: boolean }

// occurredAt（Stripe event.created，epoch ms）：订阅流事件参与乱序守卫——Stripe 不保证
// 投递顺序，apply 时丢弃比行上 lastEventAt 更旧的事件。购买类事件是绝对事实，不参与此序。
export type DomainEvent =
  | { type: 'subscription.upserted'; eventId: string; customerId: string; subscriptionId: string; status: string; priceId: string | null; currentPeriodEnd: number | null; cancelAtPeriodEnd: boolean; occurredAt?: number }
  | { type: 'subscription.deleted'; eventId: string; customerId: string; subscriptionId: string; occurredAt?: number }
  | { type: 'purchase.completed'; eventId: string; customerId: string; priceId: string | null; paymentIntentId?: string | null }
  | { type: 'purchase.refunded'; eventId: string; customerId: string; paymentIntentId?: string | null }
  | { type: 'payment.failed'; eventId: string; customerId: string; occurredAt?: number }
  | { type: 'ignored'; eventId: string }

export function resolveEntitlement(row: { status: string; plan: string; currentPeriodEnd: number | null; lifetime?: boolean; paymentFailedAt?: number | null } | null): Entitlement {
  if (!row) return { plan: 'free', status: 'none', isActive: false, currentPeriodEnd: null, lifetime: false, paymentFailed: false }
  // 终身买断无续费扣款概念，永不显示"扣款失败"。
  if (row.lifetime) return { plan: 'pro', status: 'active', isActive: true, currentPeriodEnd: null, lifetime: true, paymentFailed: false }
  const isActive = row.status === 'active' || row.status === 'trialing'
  const plan: Plan = isActive && row.plan === 'pro' ? 'pro' : 'free'
  return { plan, status: row.status, isActive, currentPeriodEnd: row.currentPeriodEnd, lifetime: false, paymentFailed: row.paymentFailedAt != null }
}

/** True when the row grants active Pro access (lifetime, or an active/trialing pro subscription). */
export function isActivePro(row: { status: string; plan: string; lifetime?: boolean }): boolean {
  return !!row.lifetime || (row.plan === 'pro' && (row.status === 'active' || row.status === 'trialing'))
}

/**
 * Effective Pro access: a paid Pro plan, or the admin role (admins outrank the
 * paywall). Use this for FEATURE gates; keep billing UI (plan badge, manage/
 * upgrade buttons) on `ent.plan` so it stays truthful — an admin without a
 * subscription has Pro access but no Stripe customer to manage.
 */
export function hasProAccess(role: string | null | undefined, ent: Entitlement): boolean {
  return ent.plan === 'pro' || role === 'admin'
}

export type BillingTransition =
  | { kind: 'activated'; userId: string; via: 'subscription' | 'lifetime' }
  | { kind: 'deactivated'; userId: string; reason: 'canceled' | 'refunded' | 'past_due' }
  | { kind: 'payment_failed'; userId: string }

export function translateStripeEvent(event: Stripe.Event): DomainEvent {
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const item = sub.items.data[0]
      return {
        type: 'subscription.upserted',
        eventId: event.id,
        customerId: String(sub.customer),
        subscriptionId: sub.id,
        status: sub.status,
        priceId: item?.price?.id ?? null,
        currentPeriodEnd: item?.current_period_end ? item.current_period_end * 1000 : null,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        occurredAt: event.created * 1000,
      }
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      return { type: 'subscription.deleted', eventId: event.id, customerId: String(sub.customer), subscriptionId: sub.id, occurredAt: event.created * 1000 }
    }
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const s = event.data.object as Stripe.Checkout.Session
      if (s.mode !== 'payment') return { type: 'ignored', eventId: event.id } // subscription checkout handled via subscription.created
      // 延迟到账支付（ACH/SEPA 等）：completed 时 payment_status 仍是 unpaid，未到账不授终身
      // Pro——到账后 Stripe 会重放为 async_payment_succeeded（走同一翻译）；扣款失败则只有
      // async_payment_failed（无授权可撤，落 default 忽略即可）。
      if (s.payment_status !== 'paid') return { type: 'ignored', eventId: event.id }
      // priceId: null is intentional — the Checkout Session object carries no line-item prices without an expand/fetch,
      // and the grant is plan-agnostic Pro, so null is fine.
      const pi = typeof s.payment_intent === 'string' ? s.payment_intent : (s.payment_intent?.id ?? null)
      return { type: 'purchase.completed', eventId: event.id, customerId: String(s.customer), priceId: null, paymentIntentId: pi }
    }
    case 'charge.refunded': {
      const c = event.data.object as Stripe.Charge
      if (!c.refunded && c.amount_refunded !== c.amount) return { type: 'ignored', eventId: event.id } // partial refund → ignore
      const pi = typeof c.payment_intent === 'string' ? c.payment_intent : (c.payment_intent?.id ?? null)
      return { type: 'purchase.refunded', eventId: event.id, customerId: String(c.customer), paymentIntentId: pi }
    }
    case 'invoice.payment_failed': {
      // 续费扣款失败：发出领域信号，供 app 内提示用户更新支付方式。
      // 重试邮件本身交给 Stripe 的 Smart Retries / Revenue Recovery（见 docs/billing.md）。
      const inv = event.data.object as Stripe.Invoice
      return { type: 'payment.failed', eventId: event.id, customerId: String(inv.customer), occurredAt: event.created * 1000 }
    }
    default:
      // 其余（invoice.paid / dispute 等）开源版忽略——商业版扩展点。
      return { type: 'ignored', eventId: event.id }
  }
}
