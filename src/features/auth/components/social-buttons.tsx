import { Github } from 'lucide-react'
import { useTranslation } from '@/features/i18n/provider'
import { signIn } from '@/features/auth/auth.client'

const LABELS: Record<'google' | 'github', string> = { google: 'Google', github: 'GitHub' }

function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88z" />
      <path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06L5.84 9.9c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

export function SocialButtons({ providers }: { providers: Array<'google' | 'github'> }) {
  const { t } = useTranslation()
  if (providers.length === 0) return null
  return (
    <>
      <div className="divider my-5">{t('auth.orContinue')}</div>
      <div className="grid gap-2.5">
        {providers.map((p) => (
          <button
            key={p}
            type="button"
            className="social-btn"
            onClick={() => signIn.social({ provider: p, callbackURL: '/app' })}
          >
            {p === 'google' ? <GoogleIcon /> : <Github size={17} />}
            {t('auth.continueWith', { provider: LABELS[p] })}
          </button>
        ))}
      </div>
    </>
  )
}
