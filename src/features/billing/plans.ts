/* DORMANT until Pro launch: the pricing page pivoted to "coming soon + waitlist",
 * so nothing calls this module (or checkoutLifetime) right now. It is the tested,
 * working purchase pipeline to re-wire when Pro goes on sale — do not delete. */
export type Interval = 'monthly' | 'yearly'

export interface PlanPrices {
  monthly: { amount: string; priceId: string }
  yearly: { amount: string; priceId: string }
}

export interface Plans {
  free: { key: 'free'; name: string; features: string[]; prices: Record<string, never> }
  pro: { key: 'pro'; name: string; features: string[]; prices: PlanPrices }
}

/** Returns plan definitions. Pass priceIds from env (server-side). */
export function getPlans(priceIds?: { monthly: string; yearly: string }): Plans {
  return {
    free: {
      key: 'free',
      name: 'Free',
      features: ['Core features', 'Community support'],
      prices: {} as Record<string, never>,
    },
    pro: {
      key: 'pro',
      name: 'Pro',
      features: ['Everything in Free', 'Pro-only area', 'Priority support'],
      prices: {
        monthly: { amount: '$9/mo', priceId: priceIds?.monthly ?? '' },
        yearly: { amount: '$90/yr', priceId: priceIds?.yearly ?? '' },
      },
    },
  }
}

export function priceIdFor(interval: Interval, priceIds: { monthly: string; yearly: string }): string {
  const id = priceIds[interval]
  if (!id) throw new Error(`Missing Stripe price id for ${interval}`)
  return id
}
