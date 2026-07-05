/**
 * Shared server-only helper: read the authenticated user from the current
 * request's session cookie. Returns null if unauthenticated.
 *
 * This is a plain async function (not a createServerFn wrapper) so it can be
 * called directly from other server-fn handlers without double-invoking the
 * RPC bridge. The `.server.ts` suffix ensures the bundler never includes this
 * in the client bundle.
 */
import { getRequestHeader } from '@tanstack/react-start/server'
import { env } from '@/lib/env'
import { createDb } from '@/db/client'
import { createAuth } from './auth.server'

export async function readUser(opts?: {
  /** 跳过 5 分钟 cookie 缓存、强制查库——权限敏感的门禁（如 admin 面）用，
   *  封禁/降权即时生效而不是等缓存过期。 */
  fresh?: boolean
}): Promise<{
  id: string
  email: string
  name: string
  image?: string | null
  role?: string | null
} | null> {
  const cookie = getRequestHeader('cookie') ?? ''
  const headers = new Headers({ cookie })
  const auth = createAuth(env, createDb(env.DB))
  const session = await auth.api.getSession(
    opts?.fresh ? { headers, query: { disableCookieCache: true } } : { headers },
  )
  if (!session?.user) return null
  const u = session.user
  return { id: u.id, email: u.email, name: u.name, image: u.image, role: u.role }
}
