import { AlertTriangle } from 'lucide-react'
import { useTranslation } from '@/features/i18n/provider'
import { portal } from '@/features/billing/actions'

/**
 * In-product nudge shown across the signed-in app when a renewal charge failed.
 * Stripe owns the retry emails (Smart Retries / Revenue Recovery — see
 * docs/billing.md); this banner is the one thing Stripe can't do: an in-app
 * signal. Visibility is driven by `entitlement.paymentFailed`, which the billing
 * webhook sets on `invoice.payment_failed` and clears on recovery.
 */
export function PaymentFailedBanner({ show }: { show: boolean }) {
  const { t } = useTranslation()
  if (!show) return null

  async function update() {
    const res = await portal()
    window.location.href = res.url // Stripe Customer Portal → update card
  }

  return (
    <div
      role="alert"
      className="mb-5 flex items-center gap-3 rounded-lg border px-4 py-3 text-sm"
      style={{
        borderColor: 'color-mix(in srgb, var(--destructive) 45%, var(--border))',
        background: 'color-mix(in srgb, var(--destructive) 10%, transparent)',
      }}
    >
      <AlertTriangle size={18} className="shrink-0" style={{ color: 'var(--destructive)' }} />
      <span className="flex-1">{t('billing.paymentFailedBanner')}</span>
      <button
        type="button"
        onClick={update}
        className="shrink-0 rounded-md px-3 py-1.5 text-sm font-semibold text-white"
        style={{ background: 'var(--destructive)' }}
      >
        {t('billing.updatePaymentMethod')}
      </button>
    </div>
  )
}
