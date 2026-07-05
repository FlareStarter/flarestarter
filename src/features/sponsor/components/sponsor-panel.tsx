import { useState } from 'react'
import { useTranslation } from '@/features/i18n/provider'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { dictionaries } from '@/features/i18n/locale'
import { sponsorConfig } from '../sponsor.config'
import { startSponsorship } from '../actions'

type Period = 'monthly' | 'once'

export function SponsorPanel() {
  const { t, locale } = useTranslation()

  // Default to first enabled mode
  const defaultPeriod: Period =
    sponsorConfig.modes.monthly ? 'monthly' : 'once'

  const [period, setPeriod] = useState<Period>(defaultPeriod)
  const [idx, setIdx] = useState(1) // default = popular tier
  const [custom, setCustom] = useState('')
  const [github, setGithub] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const tiers = sponsorConfig.tiers[period]
  const isCustom = idx === -1
  const customCents = Math.round((parseFloat(custom) || 0) * 100)
  const amountCents = isCustom ? customCents : (tiers[idx]?.amountCents ?? 0)
  const canSubmit =
    amountCents >= sponsorConfig.minCents &&
    amountCents <= sponsorConfig.maxCents

  // Access raw dict for perks (string arrays — t() only returns strings)
  const dict = dictionaries[locale]

  async function go() {
    if (!canSubmit) return
    setBusy(true)
    try {
      const { url } = await startSponsorship({
        data: {
          mode: period,
          amountCents,
          github: github || undefined,
          message: message || undefined,
        },
      })
      window.location.href = url
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Period toggle — only renders modes that are enabled */}
      {sponsorConfig.modes.monthly && sponsorConfig.modes.once && (
        <div className="mb-6 flex justify-center">
          <div className="inline-flex gap-1 rounded-full border border-border bg-bg-alt p-1">
            {(['monthly', 'once'] as Period[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setPeriod(p)
                  setIdx(1)
                }}
                className={cnPill(p === period)}
              >
                {t(`sponsor.${p}`)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tier cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        {tiers.map((tier, i) => {
          const sel = i === idx
          const name = t(`sponsor.tiers.${tier.nameKey}.name`)
          const perks: readonly string[] =
            (
              dict.sponsor.tiers as Record<
                string,
                { name: string; perks: readonly string[] }
              >
            )[tier.nameKey]?.perks ?? []
          return (
            <button
              key={tier.nameKey}
              type="button"
              aria-pressed={sel}
              onClick={() => setIdx(i)}
              className={cn(
                'relative rounded-lg border p-4 text-left transition-colors',
                sel
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-bg-alt',
              )}
            >
              {tier.popular && (
                <span className="absolute right-3 top-3 rounded-md bg-primary/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary">
                  {t('sponsor.popular')}
                </span>
              )}
              <div className="font-mono text-sm text-fg-2">{name}</div>
              <div className="mt-1">
                <span className="font-mono text-3xl font-semibold">
                  ${tier.amountCents / 100}
                </span>
                <span className="text-sm text-fg-3">
                  {period === 'monthly' ? t('sponsor.perMo') : ''}
                </span>
              </div>
              <ul className="mt-3 space-y-1.5">
                {perks.map((perk) => (
                  <li key={perk} className="flex gap-2 text-[13px] text-fg-2">
                    <span className="text-primary">✓</span>
                    {perk}
                  </li>
                ))}
              </ul>
            </button>
          )
        })}
      </div>

      {/* Custom amount row */}
      <button
        type="button"
        onClick={() => setIdx(-1)}
        className={cn(
          'mt-3 flex w-full items-center gap-3 rounded-lg border p-3 text-left',
          isCustom ? 'border-primary bg-primary/5' : 'border-border',
        )}
      >
        <span className="font-mono text-sm">{t('sponsor.customLabel')}</span>
        <span className="flex items-center rounded-md border border-border bg-background px-2">
          <span className="text-fg-3">$</span>
          <input
            type="text"
            inputMode="numeric"
            value={custom}
            placeholder="50"
            onFocus={() => setIdx(-1)}
            onChange={(e) => {
              setCustom(e.target.value.replace(/[^0-9.]/g, ''))
              setIdx(-1)
            }}
            className="w-20 bg-transparent px-1 py-1.5 outline-none"
            onClick={(e) => e.stopPropagation()}
          />
          {period === 'monthly' && (
            <span className="text-fg-3">{t('sponsor.perMo')}</span>
          )}
        </span>
        <span className="text-xs text-fg-3">{t('sponsor.customHint')}</span>
      </button>

      {/* Form card */}
      <div className="mx-auto mt-8 max-w-md rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">{t('sponsor.formTitle')}</h2>

        {/* GitHub field — only if fields.github enabled */}
        {sponsorConfig.fields.github && (
          <label className="mb-3 block text-sm text-fg-2">
            {t('sponsor.githubLabel')}{' '}
            <span className="text-fg-3">({t('sponsor.githubOptional')})</span>
            <input
              type="text"
              value={github}
              onChange={(e) => setGithub(e.target.value)}
              placeholder={t('sponsor.githubPlaceholder')}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
            />
            <span className="mt-1 block text-xs text-fg-3">
              {t('sponsor.githubNote')}
            </span>
          </label>
        )}

        {/* Message field — only if fields.message enabled */}
        {sponsorConfig.fields.message && (
          <label className="mb-4 block text-sm text-fg-2">
            {t('sponsor.messageLabel')}{' '}
            <span className="text-fg-3">({t('sponsor.messageOptional')})</span>
            <input
              type="text"
              maxLength={sponsorConfig.messageMaxLen}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('sponsor.messagePlaceholder')}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
            />
            <span className="mt-1 block text-xs text-fg-3">
              {t('sponsor.messageNote')}
            </span>
          </label>
        )}

        <button
          type="button"
          disabled={busy || !canSubmit}
          onClick={go}
          className={cn(
            buttonVariants({ size: 'lg' }),
            'w-full',
            !canSubmit && 'pointer-events-none opacity-50',
          )}
        >
          {t('sponsor.sponsorBtn')}
          {amountCents >= sponsorConfig.minCents
            ? ` $${amountCents / 100}${period === 'monthly' ? t('sponsor.perMo') : ''}`
            : ''}
        </button>
        <p className="mt-2 text-center font-mono text-xs text-fg-3">
          {t('sponsor.secure')}
        </p>
        <p className="mt-1 text-center font-mono text-xs text-fg-3">
          {period === 'monthly' ? `${t('sponsor.autoRenewNote')} · ` : ''}
          {t('sponsor.nonRefundNote')}
        </p>
        {/* the one perk with real monetary value — keep it visible at the decision point */}
        <p className="mt-1 text-center font-mono text-xs text-primary">
          {t('sponsor.earlyPerkNote')}
        </p>
      </div>
    </div>
  )
}

function cnPill(active: boolean) {
  return cn(
    'rounded-full px-4 py-2 text-sm font-semibold',
    active ? 'bg-card text-foreground shadow-sm' : 'text-fg-2',
  )
}
