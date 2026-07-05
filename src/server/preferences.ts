import { createServerFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'

export interface Preferences {
  theme: 'light' | 'dark'
  /** true = 用户显式选过主题（cookie 在）；false = theme 只是服务端回退值，
   *  客户端应继续跟随系统（boot script / next-themes system），谁也不许把回退值固化成 cookie。 */
  themeFromCookie: boolean
}

export const getPreferences = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Preferences> => {
    // Theme resolution: explicit cookie > system preference > dark (brand default).
    // The server only sees the cookie; for cookie-less visitors a pre-paint inline
    // script in __root flips to light when `prefers-color-scheme: light` — so the
    // SSR fallback here stays dark and first-time visitors follow their OS.
    const cookie = getCookie('theme')
    const themeFromCookie = cookie === 'light' || cookie === 'dark'
    return { theme: cookie === 'light' ? 'light' : 'dark', themeFromCookie }
  },
)
