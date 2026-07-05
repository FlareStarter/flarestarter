import { useTranslation } from '@/features/i18n/provider'
import type { PublicSponsor } from '../sponsor.server'
import { sponsorConfig } from '../sponsor.config'

export function SponsorsWall({ sponsors }: { sponsors: PublicSponsor[] }) {
  const { t } = useTranslation()
  if (!sponsorConfig.wall.enabled) return null
  const gold = sponsors.filter((s) => s.amount >= sponsorConfig.wall.goldCents)
  const backers = sponsors.filter((s) => s.amount >= sponsorConfig.wall.backersCents && s.amount < sponsorConfig.wall.goldCents)
  const supporters = sponsors.filter((s) => s.amount < sponsorConfig.wall.backersCents)
  const notes = sponsors.filter((s) => s.message)

  return (
    <section className="mt-16 border-t border-border pt-16">
      <div className="mx-auto max-w-2xl text-center">
        <span className="font-mono text-sm text-primary">// {t('sponsor.wallTitle')}</span>
        <h2 className="mt-2 text-3xl font-semibold">{t('sponsor.wallTitle')}</h2>
        <p className="mt-2 text-fg-2">{t('sponsor.wallSub')}</p>
      </div>

      {sponsors.length === 0 ? (
        <p className="mt-10 text-center text-fg-3">{t('sponsor.wallEmpty')}</p>
      ) : (
        <div className="mx-auto mt-10 max-w-3xl space-y-8">
          <WallRow label={t('sponsor.tierGold')} note={`$${sponsorConfig.wall.goldCents / 100}+`} sponsors={gold} size={56} t={t} />
          <WallRow label={t('sponsor.tierBackers')} note={`$${sponsorConfig.wall.backersCents / 100}+`} sponsors={backers} size={46} t={t} />
          <WallRow label={t('sponsor.tierSupporters')} note={`< $${sponsorConfig.wall.backersCents / 100}`} sponsors={supporters} size={38} t={t} />
          {notes.length > 0 && (
            <div>
              <WallHead label={t('sponsor.notesTitle')} />
              <div className="grid gap-3 sm:grid-cols-2">
                {notes.map((s) => (
                  <div key={s.github} className="rounded-lg border border-border bg-card p-4">
                    <p className="text-sm text-fg-2">"{s.message}"</p>
                    <a href={`https://github.com/${s.github}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-2 font-mono text-xs text-fg-3">
                      <img src={`https://github.com/${s.github}.png?size=48`} alt={s.github} width={22} height={22} className="rounded-full" />@{s.github}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function WallHead({ label, note }: { label: string; note?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <span className="font-mono text-sm text-fg-2">{label}</span>
      {note && <span className="font-mono text-xs text-fg-3">{note}</span>}
    </div>
  )
}

function WallRow({ label, note, sponsors, size, t }: { label: string; note: string; sponsors: PublicSponsor[]; size: number; t: (k: string) => string }) {
  if (sponsors.length === 0) return null
  return (
    <div>
      <WallHead label={label} note={note} />
      <div className="flex flex-wrap gap-3">
        {sponsors.map((s) => (
          <a key={s.github} href={`https://github.com/${s.github}`} target="_blank" rel="noopener noreferrer" title={'@' + s.github} className="relative">
            <img src={`https://github.com/${s.github}.png?size=96`} alt={s.github} width={size} height={size} className="rounded-full border border-border" />
            {s.mode === 'recurring' && (
              <span className="absolute -bottom-1 -right-1 rounded-full bg-primary px-1 py-0.5 font-mono text-[9px] text-white">
                {t('sponsor.perMo')}
              </span>
            )}
          </a>
        ))}
      </div>
    </div>
  )
}
