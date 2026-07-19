import { useEffect, useState, type ReactNode } from 'react'
import { Link, getRouteApi } from '@tanstack/react-router'
import { Home, Sparkles, Settings, Gauge, Users, Menu, ClipboardList, PanelLeftClose, PanelLeftOpen, Heart, MessageSquare } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/features/theme/theme-toggle'
import { LangSwitch } from '@/features/i18n/lang-switch'
import { useTranslation } from '@/features/i18n/provider'
import { PaymentFailedBanner } from '@/features/billing/components/payment-failed-banner'
import { UserMenu } from '@/components/app/user-menu'

const rootRoute = getRouteApi('__root__')

const COLLAPSE_KEY = 'sidebar-collapsed'

export interface ShellUser {
  name?: string | null
  email: string
  role?: string | null
  image?: string | null
}

/**
 * Shared sidebar + topbar shell for every signed-in surface. One unified nav:
 * Workspace + Account for everyone, plus an Admin group rendered only for
 * `role === 'admin'` (non-admins get no hint the console exists). Admin routes
 * stay under /admin with their own gate — only the navigation is merged.
 *
 * Desktop sidebar collapses to an icon rail; the choice sticks across pages
 * via localStorage (applied after mount so SSR markup stays deterministic).
 */
export function AppShell({
  user,
  isPro,
  active,
  crumb,
  paymentFailed,
  children,
}: {
  user: ShellUser
  isPro?: boolean
  active: string
  crumb: string
  paymentFailed?: boolean
  children: ReactNode
}) {
  const { theme } = rootRoute.useLoaderData()
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  useEffect(() => setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1'), [])
  function toggleCollapsed() {
    setCollapsed((v) => {
      localStorage.setItem(COLLAPSE_KEY, v ? '0' : '1')
      return !v
    })
  }

  // admin pages don't load billing, so the topbar badge shows the role there
  const onAdminPage = active.startsWith('admin-')

  // `rail` = collapsed icon rail (desktop only; the mobile drawer is always full-width)
  const sidebar = (rail: boolean) => {
    const item = (isActive: boolean) =>
      `app-nav-item ${isActive ? 'active' : ''} ${rail ? 'justify-center' : ''}`
    const label = (text: string) => (rail ? null : text)
    // group boundaries: text label expanded, slim centered divider on the rail
    const grp = (text: string) =>
      rail ? <div className="mx-auto my-2 h-px w-6 bg-border" aria-hidden="true" /> : <div className="grp">{text}</div>
    return (
      <>
        <div className={rail ? 'brand justify-center' : 'brand'}>
          <Logo compact={rail} />
        </div>
        {grp(t('app.navWorkspace'))}
        <Link to="/{-$locale}/app" activeProps={{}} className={item(active === 'dashboard')} title={t('app.dashboard')}>
          <Home size={18} className="shrink-0" />
          {label(t('app.dashboard'))}
        </Link>
        <Link to="/{-$locale}/app/pro" activeProps={{}} className={item(active === 'pro')} title={t('app.proDemo')}>
          <Sparkles size={18} className="shrink-0" />
          {label(t('app.proDemo'))}
          {!rail && <Badge variant="pro" className="ml-auto">Pro</Badge>}
        </Link>
        <Link to="/{-$locale}/app/feedback" activeProps={{}} className={item(active === 'feedback')} title={t('feedback.nav')}>
          <MessageSquare size={18} className="shrink-0" />
          {label(t('feedback.nav'))}
        </Link>
        {grp(t('app.navAccount'))}
        <Link to="/{-$locale}/app/account" activeProps={{}} className={item(active === 'account')} title={t('app.account')}>
          <Settings size={18} className="shrink-0" />
          {label(t('app.account'))}
        </Link>
        {user.role === 'admin' && (
          <>
            {grp(t('admin.navAdmin'))}
            <Link to="/{-$locale}/admin" activeProps={{}} className={item(active === 'admin-dashboard')} title={t('admin.dashboard')}>
              <Gauge size={18} className="shrink-0" />
              {label(t('admin.dashboard'))}
            </Link>
            <Link to="/{-$locale}/admin/users" activeProps={{}} className={item(active === 'admin-users')} title={t('admin.users')}>
              <Users size={18} className="shrink-0" />
              {label(t('admin.users'))}
            </Link>
            <Link to="/{-$locale}/admin/waitlist" activeProps={{}} className={item(active === 'admin-waitlist')} title={t('admin.waitlist')}>
              <ClipboardList size={18} className="shrink-0" />
              {label(t('admin.waitlist'))}
            </Link>
            <Link to="/{-$locale}/admin/sponsors" activeProps={{}} className={item(active === 'admin-sponsors')} title={t('admin.sponsors')}>
              <Heart size={18} className="shrink-0" />
              {label(t('admin.sponsors'))}
            </Link>
            <Link to="/{-$locale}/admin/feedback" activeProps={{}} className={item(active === 'admin-feedback')} title={t('admin.feedbackAdmin')}>
              <MessageSquare size={18} className="shrink-0" />
              {label(t('admin.feedbackAdmin'))}
            </Link>
          </>
        )}
        <div className="flex-1" />
        <UserMenu user={user} rail={rail} />
      </>
    )
  }

  return (
    <div className={`min-h-screen md:grid ${collapsed ? 'md:grid-cols-[64px_1fr]' : 'md:grid-cols-[248px_1fr]'}`}>
      {/* desktop sidebar — the plain-utility wrapper does the hiding: `.app-side`
          sets display:flex in unlayered CSS, which outranks the layered `hidden`
          utility, so `hidden` directly on the aside has no effect on mobile */}
      <div className="hidden md:block">
        {/* no px override here — .app-side's unlayered padding (12px) outranks
            padding utilities anyway, and it happens to fit the 64px rail */}
        <aside className="app-side h-full">{sidebar(collapsed)}</aside>
      </div>

      {/* mobile drawer (always full-width, never the rail) */}
      {open && (
        <div className="md:hidden">
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setOpen(false)} aria-hidden="true" />
          <aside className="app-side fixed inset-y-0 left-0 z-50 w-[248px]" onClick={() => setOpen(false)}>
            {sidebar(false)}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <div className="app-topbar">
          <button
            type="button"
            className="inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg text-fg-2 hover:bg-bg-alt hover:text-foreground md:hidden"
            aria-label="Menu"
            onClick={() => setOpen(true)}
          >
            <Menu size={20} />
          </button>
          <button
            type="button"
            className="hidden h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg text-fg-2 hover:bg-bg-alt hover:text-foreground md:inline-flex"
            aria-label={collapsed ? t('app.expandSidebar') : t('app.collapseSidebar')}
            title={collapsed ? t('app.expandSidebar') : t('app.collapseSidebar')}
            onClick={toggleCollapsed}
          >
            {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
          </button>
          <span className="app-crumb">
            <span className="hidden md:inline">
              FlareStarter <span className="mx-1.5 text-fg-3">/</span>
            </span>
            <b>{crumb}</b>
          </span>
          <div className="flex-1" />
          {onAdminPage ? (
            <Badge variant="pro" dot className="shrink-0">
              {user.role || 'admin'}
            </Badge>
          ) : (
            <Badge variant={isPro ? 'pro' : 'free'} dot className="shrink-0">
              {isPro ? t('billing.pro') : t('billing.free')}
            </Badge>
          )}
          <ThemeToggle theme={theme} />
          <LangSwitch />
        </div>
        <div className="app-main">
          <PaymentFailedBanner show={!!paymentFailed} />
          {children}
        </div>
      </div>
    </div>
  )
}
