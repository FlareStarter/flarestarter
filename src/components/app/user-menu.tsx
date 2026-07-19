import { useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { ChevronsUpDown, LogOut, Settings } from 'lucide-react'
import { signOut } from '@/features/auth/auth.client'
import { useTranslation } from '@/features/i18n/provider'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import type { ShellUser } from '@/components/app/app-shell'

function initials(primary: string): string {
  const parts = primary.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return primary.slice(0, 2).toUpperCase()
}

/**
 * Sidebar footer user menu. The whole identity block is the trigger — on the
 * collapsed rail only the avatar remains, so the popover header is the one
 * place full identity stays visible. Logout mirrors the Account page handler
 * (signOut → /login) so both paths stay behaviorally identical.
 */
export function UserMenu({ user, rail }: { user: ShellUser; rail: boolean }) {
  const { t } = useTranslation()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const primary = user.name || user.email

  async function handleLogout() {
    if (busy) return
    setBusy(true)
    try {
      await signOut()
      await router.navigate({ to: '/{-$locale}/login' })
    } finally {
      setBusy(false)
      setOpen(false)
    }
  }

  return (
    <div className="border-t border-border pt-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-bg-alt ${rail ? 'justify-center px-0' : ''}`}
          title={primary}
          aria-label={t('app.userMenuLabel')}
        >
          <Avatar>
            <AvatarImage src={user.image ?? undefined} alt={primary} />
            <AvatarFallback>{initials(primary)}</AvatarFallback>
          </Avatar>
          {!rail && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-foreground">{primary}</span>
                <span className="block truncate text-xs text-fg-3">{user.email}</span>
              </span>
              <ChevronsUpDown size={14} className="shrink-0 text-fg-3" />
            </>
          )}
        </PopoverTrigger>
        <PopoverContent side="top" align="start" className="w-[220px] p-1.5">
          <div className="px-2 pb-1.5 pt-1">
            <div className="truncate text-[13px] font-semibold text-foreground">{primary}</div>
            <div className="truncate text-xs text-fg-3">{user.email}</div>
          </div>
          <div className="border-t border-border pt-1">
            <Link
              to="/{-$locale}/app/account"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] font-medium text-fg-2 hover:bg-bg-alt hover:text-foreground"
            >
              <Settings size={14} className="shrink-0" /> {t('app.account')}
            </Link>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleLogout()}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-medium text-destructive hover:bg-bg-alt disabled:opacity-60"
            >
              <LogOut size={14} className="shrink-0" /> {t('auth.logout')}
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
