import Stripe from 'stripe'
import { translateStripeEvent, type DomainEvent } from './entitlement'
import type { PaymentProvider, CheckoutInput } from './payment'

interface StripeEnv { STRIPE_SECRET_KEY: string; STRIPE_WEBHOOK_SECRET: string }

export function createStripeProvider(env: StripeEnv): PaymentProvider {
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, { httpClient: Stripe.createFetchHttpClient() })
  const cryptoProvider = Stripe.createSubtleCryptoProvider()

  return {
    async ensureCustomer(user, existingCustomerId) {
      if (existingCustomerId) return existingCustomerId
      const customer = await stripe.customers.create({ email: user.email, metadata: { userId: user.id } })
      return customer.id
    },
    async createCheckoutSession(input: CheckoutInput) {
      const session = await stripe.checkout.sessions.create({
        mode: input.mode,
        customer: input.customerId,
        line_items: [{ price: input.priceId, quantity: 1 }],
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        client_reference_id: input.userId,
      })
      if (!session.url) throw new Error('Stripe did not return a checkout URL')
      return { url: session.url }
    },
    async createPortalSession(customerId, returnUrl) {
      const session = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: returnUrl })
      return { url: session.url }
    },
    async parseWebhook(rawBody, signature): Promise<DomainEvent> {
      const event = await stripe.webhooks.constructEventAsync(rawBody, signature, env.STRIPE_WEBHOOK_SECRET, undefined, cryptoProvider)
      return translateStripeEvent(event)
    },
    async cancelSubscription(subscriptionId) {
      try {
        await stripe.subscriptions.cancel(subscriptionId)
      } catch (err) {
        // Idempotency: a webhook retry after a partial failure may hit a sub
        // that is already canceled or gone — both mean "done", not an error.
        if (err instanceof Stripe.errors.StripeInvalidRequestError &&
            (err.code === 'resource_missing' || /canceled/i.test(err.message))) return
        throw err
      }
    },
  }
}
