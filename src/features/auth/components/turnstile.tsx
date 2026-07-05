/**
 * Cloudflare Turnstile bot protection for the auth forms.
 *
 * `useTurnstile(siteKey)` lazy-loads the Turnstile script, renders the widget,
 * and hands back the solved token. When `siteKey` is null (TURNSTILE_SITE_KEY
 * unset) it no-ops — the forms work exactly as before, matching the project's
 * "blank env degrades gracefully" convention.
 *
 * The token is sent to better-auth's captcha plugin via the `x-captcha-response`
 * header (see captchaHeaders).
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string
  reset: (id?: string) => void
  remove: (id?: string) => void
}
declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SCRIPT_ID = 'cf-turnstile'
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

function loadScript(onReady: () => void) {
  if (window.turnstile) return onReady()
  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
  if (existing) {
    existing.addEventListener('load', onReady, { once: true })
    return
  }
  const s = document.createElement('script')
  s.id = SCRIPT_ID
  s.src = SCRIPT_SRC
  s.async = true
  s.defer = true
  s.addEventListener('load', onReady, { once: true })
  document.head.appendChild(s)
}

/** Header object to pass as better-auth fetchOptions, or undefined when no token. */
export function captchaHeaders(token: string | null) {
  return token ? { headers: { 'x-captcha-response': token } } : undefined
}

export function useTurnstile(siteKey: string | null): {
  token: string | null
  enabled: boolean
  widget: ReactNode
  reset: () => void
} {
  const [token, setToken] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!siteKey) return
    let cancelled = false
    loadScript(() => {
      if (cancelled || !window.turnstile || !containerRef.current || widgetIdRef.current) return
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (t: string) => setToken(t),
        'error-callback': () => setToken(null),
        'expired-callback': () => setToken(null),
        theme: 'auto',
      })
    })
    return () => {
      cancelled = true
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = undefined
      }
    }
  }, [siteKey])

  // Turnstile tokens are single-use — call after a failed submit to get a fresh one.
  const reset = useCallback(() => {
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current)
      setToken(null)
    }
  }, [])

  const widget = siteKey ? <div ref={containerRef} className="flex justify-center" /> : null
  return { token, enabled: !!siteKey, widget, reset }
}
