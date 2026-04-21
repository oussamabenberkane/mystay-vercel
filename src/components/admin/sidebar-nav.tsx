'use client'

import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  UtensilsCrossed,
  Menu,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { logoutAction } from '@/lib/actions/auth'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'

interface AdminSidebarNavProps {
  hotelName: string
  adminName: string
}

function SidebarContent({
  hotelName,
  adminName,
  locale,
  pathname,
  onClose,
}: {
  hotelName: string
  adminName: string
  locale: string
  pathname: string
  onClose?: () => void
}) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const tNav = useTranslations('nav')
  const tAuth = useTranslations('auth')

  const navItems = [
    { href: '/admin/operations', icon: LayoutDashboard, label: tNav('operations') },
    { href: '/admin/users',      icon: Users,           label: 'Users'             }, // TODO: i18n
    { href: '/admin/stays',      icon: CalendarDays,    label: 'Stays'             }, // TODO: i18n
    { href: '/admin/menu',       icon: UtensilsCrossed, label: tNav('menu')        },
  ]

  async function handleLogout() {
    setIsLoggingOut(true)
    await logoutAction()
  }

  return (
    <div className="flex h-full flex-col" style={{ background: '#1B2D5B' }}>
      {/* Brand */}
      <div
        className="flex items-center gap-3 px-6 py-6"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
          style={{ background: '#C9A84C', color: '#1B2D5B' }}
        >
          MS
        </div>
        <div className="overflow-hidden">
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#C9A84C' }}>
            My Stay
          </p>
          <p
            className="font-heading text-sm font-medium truncate"
            style={{ color: 'rgba(248,240,232,0.85)' }}
          >
            {hotelName}
          </p>
        </div>
      </div>

      {/* Nav label */}
      <div className="px-6 pt-5 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(248,240,232,0.35)' }}>
          Admin Portal
        </p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map(({ href, icon: Icon, label }) => {
          const fullHref = `/${locale}${href}`
          const isActive = pathname.startsWith(fullHref)

          return (
            <Link
              key={href}
              href={fullHref}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-150',
                !isActive && 'hover:bg-white/5'
              )}
              style={
                isActive
                  ? { background: '#C9A84C', color: '#1B2D5B' }
                  : { color: 'rgba(248,240,232,0.75)' }
              }
            >
              <Icon className="size-[18px] shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div
        className="px-6 py-5"
        style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
      >
        <p className="text-xs font-medium mb-0.5" style={{ color: 'rgba(248,240,232,0.85)' }}>
          {adminName}
        </p>
        <p className="text-[11px] mb-3" style={{ color: 'rgba(248,240,232,0.35)' }}>
          Administrator
        </p>
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="cursor-pointer text-xs font-medium transition-all hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ color: 'rgba(248,240,232,0.5)' }}
        >
          {isLoggingOut ? '…' : tAuth('logout')}
        </button>
      </div>
    </div>
  )
}

export function AdminSidebarNav({ hotelName, adminName }: AdminSidebarNavProps) {
  const pathname = usePathname()
  const params = useParams()
  const locale = typeof params.locale === 'string' ? params.locale : 'en'
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 md:block" style={{ minHeight: '100vh' }}>
        <div className="sticky top-0 h-screen">
          <SidebarContent
            hotelName={hotelName}
            adminName={adminName}
            locale={locale}
            pathname={pathname}
          />
        </div>
      </aside>

      {/* Mobile header + sheet drawer */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3"
        style={{ background: '#1B2D5B', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="flex size-7 items-center justify-center rounded-lg text-xs font-bold"
            style={{ background: '#C9A84C', color: '#1B2D5B' }}
          >
            MS
          </div>
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#C9A84C' }}>
            My Stay
          </span>
        </div>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger
            className="flex size-8 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-white/10"
            style={{ color: 'rgba(248,240,232,0.75)' }}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64" style={{ border: 'none' }}>
            <SidebarContent
              hotelName={hotelName}
              adminName={adminName}
              locale={locale}
              pathname={pathname}
              onClose={() => setMobileOpen(false)}
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* Mobile top-bar spacer */}
      <div className="md:hidden h-[52px] shrink-0" />
    </>
  )
}
