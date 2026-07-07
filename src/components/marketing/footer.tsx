import { Link } from '@tanstack/react-router'
import { useTranslation } from '@/features/i18n/provider'
import { Logo } from '@/components/brand/logo'
import { ThemeToggle } from '@/features/theme/theme-toggle'
import { LangSwitch } from '@/features/i18n/lang-switch'

const GITHUB_URL = 'https://github.com/flarestarter/flarestarter'
const TELEGRAM_URL = 'https://t.me/+coaN5Ihjte9jNzZl'

export function Footer({ theme }: { theme: 'light' | 'dark' }) {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border bg-bg-alt px-5 md:px-7 py-10">
      <div className="grid gap-7 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        {/* Brand */}
        <div className="col-span-2 md:col-span-1">
          <Logo />
          <p className="mt-3.5 max-w-[22em] text-[13.5px] leading-relaxed text-fg-3">
            {t('marketing.footerTagline')}
          </p>
        </div>

        {/* Product */}
        <FooterCol title={t('marketing.footerProduct')}>
          <Link className="foot-link" to="/{-$locale}" hash="features">{t('marketing.navFeatures')}</Link>
          <Link className="foot-link" to="/{-$locale}/pricing">{t('marketing.footerPricing')}</Link>
          <Link className="foot-link" to="/{-$locale}/waitlist">{t('marketing.footerWaitlist')}</Link>
          <Link className="foot-link" to="/{-$locale}/changelog">{t('marketing.footerChangelog')}</Link>
          <Link className="foot-link" to="/{-$locale}/sponsor">{t('sponsor.footerSponsor')}</Link>
          <a className="foot-link" href="/docs">{t('marketing.footerDocs')}</a>
        </FooterCol>

        {/* Resources */}
        <FooterCol title={t('marketing.footerResources')}>
          <a className="foot-link" href={GITHUB_URL}>{t('marketing.footerGithub')}</a>
          <a className="foot-link" href={TELEGRAM_URL} target="_blank" rel="noreferrer">{t('marketing.footerTelegram')}</a>
        </FooterCol>

        {/* Legal */}
        <FooterCol title={t('marketing.footerLegal')}>
          <Link className="foot-link" to="/{-$locale}/terms">{t('marketing.footerTerms')}</Link>
          <Link className="foot-link" to="/{-$locale}/privacy">{t('marketing.footerPrivacy')}</Link>
          <a className="foot-link" href={`${GITHUB_URL}/blob/main/LICENSE`}>{t('marketing.footerLicense')}</a>
        </FooterCol>
      </div>

      <div className="mt-8 flex flex-col items-start justify-between gap-4 border-t border-border pt-5 sm:flex-row sm:items-center">
        <p className="text-[13px] text-fg-3">
          &copy; {year} {t('common.appName')}. {t('marketing.footerRights')}
        </p>
        <div className="flex items-center gap-1">
          <ThemeToggle theme={theme} />
          <LangSwitch />
        </div>
      </div>
    </footer>
  )
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-fg-3">{title}</h4>
      <div className="flex flex-col gap-0.5 [&_.foot-link]:py-2 md:[&_.foot-link]:py-1 [&_.foot-link]:text-sm [&_.foot-link]:text-fg-2 [&_.foot-link:hover]:text-foreground [&_.foot-link]:transition-colors">
        {children}
      </div>
    </div>
  )
}
