import Stripe from 'stripe'

export interface SponsorStripeEnv {
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET: string
}

function client(env: SponsorStripeEnv): Stripe {
  return new Stripe(env.STRIPE_SECRET_KEY, { httpClient: Stripe.createFetchHttpClient() })
}

/** Amount-driven sponsorship checkout. Monthly uses an inline recurring price_data
 *  so any amount works without pre-created Stripe prices. */
export async function createSponsorCheckout(
  env: SponsorStripeEnv,
  opts: { mode: 'once' | 'monthly'; amountCents: number; successUrl: string; cancelUrl: string; github?: string; message?: string },
): Promise<{ url: string }> {
  const stripe = client(env)
  const meta: Record<string, string> = { type: 'sponsorship', mode: opts.mode }
  if (opts.github) meta.github = opts.github
  if (opts.message) meta.message = opts.message
  const base = { success_url: opts.successUrl, cancel_url: opts.cancelUrl, metadata: meta } as const

  let session: Stripe.Checkout.Session
  if (opts.mode === 'once') {
    session = await stripe.checkout.sessions.create({
      ...base,
      mode: 'payment',
      line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: opts.amountCents, product_data: { name: 'One-time sponsorship' } } }],
      payment_intent_data: { metadata: meta },
    })
  } else {
    session = await stripe.checkout.sessions.create({
      ...base,
      mode: 'subscription',
      line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: opts.amountCents, recurring: { interval: 'month' }, product_data: { name: 'Monthly sponsorship' } } }],
      subscription_data: { metadata: meta },
    })
  }
  if (!session.url) throw new Error('Stripe did not return a checkout URL')
  return { url: session.url }
}

/** Build a one-off Stripe Customer Portal link for a completed checkout session
 *  (used on the success page so anonymous monthly sponsors can cancel). Returns
 *  null when the session has no customer (e.g. one-time without a customer). */
export async function createPortalLinkForSession(env: SponsorStripeEnv, sessionId: string, returnUrl: string): Promise<string | null> {
  const stripe = client(env)
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    // session id 本身是无鉴权能力凭证（出现在 success URL / 浏览器历史 / 日志），必须限制寿命：
    // 只对 24 小时内完成的 session 换发 Portal 链接，过期后由管理员/邮件渠道兜底。
    if (session.status !== 'complete') return null
    if (Date.now() - session.created * 1000 > 24 * 60 * 60 * 1000) return null
    const customer = typeof session.customer === 'string' ? session.customer : (session.customer?.id ?? null)
    if (!customer) return null
    const portal = await stripe.billingPortal.sessions.create({ customer, return_url: returnUrl })
    return portal.url
  } catch (err) {
    console.error('[sponsor] portal link failed', err)
    return null
  }
}

export async function constructSponsorEvent(env: SponsorStripeEnv, rawBody: string, signature: string): Promise<Stripe.Event> {
  const stripe = client(env)
  const cryptoProvider = Stripe.createSubtleCryptoProvider()
  return stripe.webhooks.constructEventAsync(rawBody, signature, env.STRIPE_WEBHOOK_SECRET, undefined, cryptoProvider)
}
