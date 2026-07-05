import { Link } from '@tanstack/react-router'
import { useTranslation } from '@/features/i18n/provider'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { portal } from '@/features/billing/actions'
import { fmtDate } from '@/lib/format-date'

export function ManageSubscription({
  plan,
  status,
  currentPeriodEnd,
  lifetime,
}: {
  plan: 'free' | 'pro'
  status: string
  currentPeriodEnd?: number | null
  lifetime?: boolean
}) {
  const { t } = useTranslation()
  const isPro = plan === 'pro'
  async function manage() {
    const res = await portal()
    window.location.href = res.url
  }

  if (lifetime) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5 text-sm">
          <Badge variant="pro" dot>{t('billing.lifetimeOwned')}</Badge>
        </div>
        <p className="m-0 text-[13px] text-fg-3">{t('billing.lifetimeNote')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5 text-sm">
        <Badge variant={isPro ? 'pro' : 'free'} dot>
          {isPro ? t('billing.pro') : t('billing.free')}
        </Badge>
        <span className="text-fg-3">
          {t('billing.status')}: {status}
        </span>
      </div>
      {isPro && currentPeriodEnd != null && (
        <p className="m-0 text-[13px] text-fg-3">
          {/* fmtDate（UTC 确定性）：toLocaleDateString 服务端/浏览器结果不同，SSR 会 hydration mismatch */}
          {t('billing.renewsOn')}: {fmtDate(new Date(currentPeriodEnd))}
        </p>
      )}
      {isPro ? (
        <div>
          <Button variant="outline" onClick={manage}>
            {t('billing.manageSubscription')}
          </Button>
        </div>
      ) : (
        <Link to="/{-$locale}/pricing" className={buttonVariants()}>
          {t('billing.upgrade')}
        </Link>
      )}
    </div>
  )
}
