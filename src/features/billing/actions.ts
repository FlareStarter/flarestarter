import { createServerFn } from '@tanstack/react-start'
import { redirect } from '@tanstack/react-router'
import type { Interval } from './plans'

export const checkout = createServerFn({ method: 'POST' })
  .validator((d: { interval: Interval }) => d)
  .handler(async ({ data }) => {
    const { env } = await import('@/lib/env')
    const { createDb } = await import('@/db/client')
    const { readUser } = await import('@/features/auth/readUser.server')
    const { startCheckout } = await import('./billing.server')
    const { createStripeProvider } = await import('./stripe')
    const user = await readUser()
    if (!user) throw redirect({ to: '/{-$locale}/login' })
    const priceId = data.interval === 'monthly' ? env.STRIPE_PRICE_PRO_MONTHLY : env.STRIPE_PRICE_PRO_YEARLY
    if (!priceId) throw new Error(`Missing Stripe price id for ${data.interval}`)
    const base = new URL(env.BETTER_AUTH_URL).origin
    return startCheckout(
      createDb(env.DB),
      createStripeProvider(env),
      user,
      priceId,
      `${base}/app?checkout=success`,
      `${base}/pricing`,
      Date.now(),
    )
  })

// DORMANT until Pro launch — see the note in ./plans.ts.
export const checkoutLifetime = createServerFn({ method: 'POST' }).handler(async () => {
  const { env } = await import('@/lib/env')
  const { createDb } = await import('@/db/client')
  const { readUser } = await import('@/features/auth/readUser.server')
  const { startCheckout } = await import('./billing.server')
  const { createStripeProvider } = await import('./stripe')
  const user = await readUser()
  if (!user) throw redirect({ to: '/{-$locale}/login' })
  const priceId = env.STRIPE_PRICE_PRO_LIFETIME
  if (!priceId) throw new Error('Missing Stripe price id for lifetime')
  const base = new URL(env.BETTER_AUTH_URL).origin
  return startCheckout(
    createDb(env.DB),
    createStripeProvider(env),
    user,
    priceId,
    `${base}/app?checkout=success`,
    `${base}/pricing`,
    Date.now(),
    'payment',
  )
})

export const portal = createServerFn({ method: 'POST' }).handler(async () => {
  const { env } = await import('@/lib/env')
  const { createDb } = await import('@/db/client')
  const { readUser } = await import('@/features/auth/readUser.server')
  const { openPortal } = await import('./billing.server')
  const { createStripeProvider } = await import('./stripe')
  const user = await readUser()
  if (!user) throw redirect({ to: '/{-$locale}/login' })
  const base = new URL(env.BETTER_AUTH_URL).origin
  return openPortal(createDb(env.DB), createStripeProvider(env), user.id, `${base}/app/account`)
})
