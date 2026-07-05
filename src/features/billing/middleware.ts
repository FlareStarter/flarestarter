import { createServerFn } from '@tanstack/react-start'
import { redirect } from '@tanstack/react-router'
import type { Entitlement } from './entitlement'

export const getEntitlement = createServerFn({ method: 'GET' }).handler(async (): Promise<Entitlement> => {
  const { readUser } = await import('@/features/auth/readUser.server')
  const { getEntitlementFor } = await import('./billing.server')
  const { createDb } = await import('@/db/client')
  const { env } = await import('@/lib/env')
  const user = await readUser()
  if (!user) throw redirect({ to: '/{-$locale}/login' })
  return getEntitlementFor(createDb(env.DB), user.id)
})

/** Guard: require Pro access. Redirects to /pricing if not Pro (admins pass — role outranks the paywall). */
export const requireProPlan = createServerFn({ method: 'GET' }).handler(async (): Promise<Entitlement> => {
  const { readUser } = await import('@/features/auth/readUser.server')
  const { getEntitlementFor } = await import('./billing.server')
  const { hasProAccess } = await import('./entitlement')
  const { createDb } = await import('@/db/client')
  const { env } = await import('@/lib/env')
  const user = await readUser()
  if (!user) throw redirect({ to: '/{-$locale}/login' })
  const ent = await getEntitlementFor(createDb(env.DB), user.id)
  if (!hasProAccess(user.role, ent)) throw redirect({ to: '/{-$locale}/pricing' })
  return ent
})

/**
 * Factory wrapper for backward-compat with T9 usage.
 * Only 'pro' is supported (the single paid plan).
 */
export const requirePlan = (_plan: 'pro') => requireProPlan
