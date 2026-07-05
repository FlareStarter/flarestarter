import type { DomainEvent } from './entitlement'

export interface CheckoutInput {
  customerId: string
  priceId: string
  userId: string
  successUrl: string
  cancelUrl: string
  mode: 'subscription' | 'payment'
}

export interface PaymentProvider {
  ensureCustomer(user: { id: string; email: string }, existingCustomerId: string | null): Promise<string>
  createCheckoutSession(input: CheckoutInput): Promise<{ url: string }>
  createPortalSession(customerId: string, returnUrl: string): Promise<{ url: string }>
  parseWebhook(rawBody: string, signature: string): Promise<DomainEvent>
  /** Immediately cancel a live subscription. MUST be idempotent: canceling an
   *  already-canceled/missing subscription resolves (webhook retries re-run it). */
  cancelSubscription(subscriptionId: string): Promise<void>
}
