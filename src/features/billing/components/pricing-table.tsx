import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Check, Bell, Github, Heart } from 'lucide-react'
import { useTranslation } from '@/features/i18n/provider'
import { buttonVariants } from '@/components/ui/button'
import { WaitlistDialog } from '@/features/waitlist/components/waitlist-dialog'
import type { Locale } from '@/features/i18n/locale'

// Set this to your real repository URL before publishing.
const GITHUB_URL = 'https://github.com/flarestarter/flarestarter'

interface Content {
  kicker: string
  title: string
  subtitle: string
  lifetimeNote: string
  personal: string
  team: string
  freeName: string
  proName: string
  comingSoon: string
  freeDesc: string
  proDesc: string
  once: string
  freeNote: string
  proNote: string
  proTeamNote: string
  ctaFree: string
  ctaPro: string
  bandKicker: string
  bandTitle: string
  bandSub: string
  bandSponsor: string
  freeFeats: string[]
  proFeats: string[]
}

/* Pricing copy lives here (not in the shared i18n dictionary) because the
 * feature lists are arrays, which the Dict string type can't express.
 * This is a marketing surface, but every claim matches what
 * this repo actually ships: the open-source core is a complete app (auth +
 * Stripe billing + admin all included). Pro (a one-time lifetime license adding
 * updates and priority support) is ANNOUNCED but not purchasable yet — the CTA
 * joins the waitlist (source="pricing") instead of opening a checkout, and the
 * card is labeled "coming soon" with planned pricing. When Pro actually ships,
 * swap the CTA to the checkout server fn and drop the coming-soon copy. */
const CONTENT: Record<Locale, Content> = {
  en: {
    kicker: '// pricing',
    title: 'Open source core. Pro once, forever.',
    subtitle:
      'Clone the complete Apache 2.0 core today — it ships a real app. Pro is on the way: pay once, stay current for life, and get answers straight from the maintainers. Join the waitlist to be first in line.',
    lifetimeNote: 'One-time purchase · no subscription, ever',
    personal: 'Personal',
    team: 'Team',
    freeName: 'Open source',
    proName: 'Pro',
    comingSoon: 'Coming soon',
    freeDesc: 'The complete Apache 2.0 template. Yours to clone.',
    proDesc: 'Pay once. Stay current for life, with the maintainers one message away.',
    once: 'once',
    freeNote: 'Apache 2.0 licensed · no card required',
    proNote: 'Planned pricing · 1 developer · all future updates',
    proTeamNote: 'Planned pricing · up to 4 developers · all future updates',
    ctaFree: 'Clone on GitHub',
    ctaPro: 'Join the waitlist',
    bandKicker: '// real talk',
    bandTitle: 'The open core might be all you need.',
    bandSub: 'If it saves you a weekend, consider sponsoring — an early-sponsor discount will be waiting when Pro lands.',
    bandSponsor: 'Sponsor the project',
    freeFeats: [
      'Complete Apache 2.0 template',
      'Cloudflare Workers deploy',
      'Auth + Stripe billing + admin',
      'D1 · KV · dark mode · i18n',
      'Community support',
    ],
    proFeats: [
      'Everything in the open core',
      'Lifetime updates — all future modules included',
      'Priority support, straight from the maintainers',
      'Premium modules, exclusive to Pro',
    ],
  },
  zh: {
    kicker: '// pricing',
    title: '开源核心，Pro 一次买断、终身可用',
    subtitle:
      '今天即可克隆完整的 Apache 2.0 核心——它本身就是个可用的应用。Pro 正在路上：一次付费，底座终身保持最新，遇到问题维护者直接答。加入等待列表，上线第一时间通知你。',
    lifetimeNote: '一次性买断 · 永不订阅',
    personal: '个人',
    team: '团队',
    freeName: '开源版',
    proName: 'Pro',
    comingSoon: '即将推出',
    freeDesc: '完整的 Apache 2.0 模板，克隆即用',
    proDesc: '一次付费，终身保持最新；卡住时，维护者直接答。',
    once: '买断',
    freeNote: 'Apache 2.0 许可 · 无需信用卡',
    proNote: '规划定价 · 1 名开发者 · 含所有后续更新',
    proTeamNote: '规划定价 · 最多 4 名开发者 · 含所有后续更新',
    ctaFree: '在 GitHub 克隆',
    ctaPro: '加入等待列表',
    bandKicker: '// 说句实话',
    bandTitle: '开源版，可能就够你用了。',
    bandSub: '如果它帮你省了不少时间，欢迎赞助支持——Pro 上线时，早期赞助者有专属折扣。',
    bandSponsor: '赞助这个项目',
    freeFeats: ['完整 Apache 2.0 模板', 'Cloudflare Workers 部署', '认证 + Stripe 计费 + 后台', 'D1 · KV · 暗色 · 国际化', '社区支持'],
    proFeats: [
      '开源核心的全部',
      '终身更新，含未来所有模块',
      '优先支持，维护者亲自解答',
      '更多高级模块，Pro 专属',
    ],
  },
}

function PriceCard({
  c,
  plan,
  team,
  onPay,
}: {
  c: Content
  plan: 'free' | 'pro'
  team: boolean
  onPay: () => void
}) {
  const isPro = plan === 'pro'
  const price = isPro ? (team ? '$499' : '$199') : '$0'
  const note = isPro ? (team ? c.proTeamNote : c.proNote) : c.freeNote
  return (
    <div
      className="term"
      style={{
        boxShadow: isPro ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
        borderColor: isPro ? 'var(--primary)' : 'var(--border)',
      }}
    >
      <div className="term-bar justify-between">
        <span className="font-mono text-xs text-fg-2"># {isPro ? c.proName : c.freeName}</span>
        {isPro && <span className="metric">{c.comingSoon}</span>}
      </div>
      <div className="p-6 font-sans">
        <p className="m-0 mb-3.5 text-[13.5px] text-fg-3">{isPro ? c.proDesc : c.freeDesc}</p>
        <div className="flex items-baseline gap-1.5">
          <span key={price} className="price-pop font-mono text-[38px] font-semibold">
            {price}
          </span>
          {isPro && <span className="text-sm text-fg-3">{c.once}</span>}
        </div>
        <div
          className="font-mono text-xs"
          style={{ color: isPro ? 'var(--primary)' : 'var(--fg-3)', margin: '6px 0 20px', minHeight: 16 }}
        >
          {note}
        </div>
        {isPro ? (
          <button type="button" className={buttonVariants({ className: 'w-full' })} onClick={onPay}>
            <Bell size={16} /> {c.ctaPro}
          </button>
        ) : (
          <a href={GITHUB_URL} className={buttonVariants({ variant: 'outline', className: 'w-full' })}>
            <Github size={15} /> {c.ctaFree}
          </a>
        )}
        <div className="my-5 h-px bg-border" />
        <div className="grid gap-2.5">
          {(isPro ? c.proFeats : c.freeFeats).map((f) => (
            <div key={f} className="flex items-start gap-2.5 text-sm text-fg-2">
              <span className="mt-0.5 shrink-0 text-primary">
                <Check size={16} />
              </span>
              {f}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ToggleBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full px-[18px] py-2 text-sm font-semibold transition-colors ${
        active ? 'bg-card text-foreground shadow-[var(--shadow-sm)]' : 'text-fg-2'
      }`}
    >
      {children}
    </button>
  )
}

export function PricingTable({ turnstileSiteKey }: { turnstileSiteKey: string | null }) {
  const { locale } = useTranslation()
  const c = CONTENT[locale]
  const [team, setTeam] = useState(false)
  const [waitlistOpen, setWaitlistOpen] = useState(false)

  return (
    <>
      {/* heading + toggle */}
      <section className="grid-bg px-5 md:px-7 pb-10 pt-14 text-center">
        <span className="kicker">{c.kicker}</span>
        <h1 className="m-0 mb-3 mt-2.5 font-display text-[28px] font-semibold tracking-[-1px] sm:text-[36px]">
          {c.title}
        </h1>
        <p className="mx-auto mb-5 max-w-[34em] text-base text-fg-2">{c.subtitle}</p>
        <div className="inline-flex gap-0.5 rounded-full border border-border bg-bg-alt p-1" role="group">
          <ToggleBtn active={!team} onClick={() => setTeam(false)}>
            {c.personal}
          </ToggleBtn>
          <ToggleBtn active={team} onClick={() => setTeam(true)}>
            {c.team}
          </ToggleBtn>
        </div>
        <div className="mt-3 font-mono text-[12.5px] text-fg-3">{c.lifetimeNote}</div>
      </section>

      {/* price cards */}
      <section className="mx-auto grid max-w-3xl items-stretch gap-[18px] px-5 md:px-7 pb-2 md:grid-cols-2">
        <PriceCard c={c} plan="free" team={team} onPay={() => setWaitlistOpen(true)} />
        <PriceCard c={c} plan="pro" team={team} onPay={() => setWaitlistOpen(true)} />
      </section>

      {/* closing band: honest nudge + sponsor bridge */}
      <section className="grid-bg mt-10 border-t border-border px-5 md:px-7 py-14 text-center">
        <span className="kicker">{c.bandKicker}</span>
        <h2 className="m-0 mb-3 mt-2.5 font-display text-[24px] font-semibold tracking-[-0.8px] sm:text-[30px]">
          {c.bandTitle}
        </h2>
        <p className="mx-auto mb-7 max-w-[36em] text-[15px] leading-snug text-fg-2">{c.bandSub}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a href={GITHUB_URL} className={buttonVariants({})}>
            <Github size={15} /> {c.ctaFree}
          </a>
          <Link to="/{-$locale}/sponsor" className={buttonVariants({ variant: 'outline' })}>
            <Heart size={15} /> {c.bandSponsor}
          </Link>
        </div>
      </section>

      <WaitlistDialog
        open={waitlistOpen}
        onOpenChange={setWaitlistOpen}
        turnstileSiteKey={turnstileSiteKey}
        source="pricing"
      />
    </>
  )
}
