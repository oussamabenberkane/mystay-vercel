'use client'

import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import { ClipboardList, Bell, MessageCircle, LogOut } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { logoutAction } from '@/lib/actions/auth'
import { useState } from 'react'

export function StaffSidebarNav({ staffName }: { staffName: string }) {
  const pathname = usePathname()
  const params = useParams()
  const locale = typeof params.locale === 'string' ? params.locale : 'en'
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const tNav = useTranslations('nav')
  const tAuth = useTranslations('auth')

  const navItems = [
    { href: '/staff/orders',   icon: ClipboardList,  label: tNav('orders')   },
    { href: '/staff/requests', icon: Bell,            label: tNav('requests') },
    { href: '/staff/chat',     icon: MessageCircle,  label: tNav('chat')     },
  ]

  async function handleLogout() {
    setIsLoggingOut(true)
    await logoutAction()
  }

  return (
    <aside
      className="hidden w-64 flex-col md:flex"
      style={{ background: '#1B2D5B', minHeight: '100vh' }}
    >
      {/* Brand mark */}
      <div className="flex items-center gap-3 px-6 py-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div
          className="flex size-9 items-center justify-center rounded-xl text-sm font-bold"
          style={{ background: '#C9A84C', color: '#1B2D5B' }}
        >
          MS
        </div>
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#C9A84C' }}>
            My Stay
          </p>
          <p className="text-[11px]" style={{ color: 'rgba(248,240,232,0.5)' }}>
            Staff Portal
          </p>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const fullHref = `/${locale}${href}`
          const isActive = pathname.startsWith(fullHref)

          return (
            <Link
              key={href}
              href={fullHref}
              className={cn(
                'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'text-[#1B2D5B]'
                  : 'hover:bg-white/8'
              )}
              style={
                isActive
                  ? { background: '#C9A84C', color: '#1B2D5B' }
                  : { color: 'rgba(248,240,232,0.75)' }
              }
            >
              <Icon className="size-[18px] shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer with user info + sign out */}
      <div className="px-4 py-4 border-t space-y-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="px-2">
          <p className="text-xs font-medium truncate" style={{ color: 'rgba(248,240,232,0.9)' }}>
            {staffName}
          </p>
          <p className="text-[11px]" style={{ color: 'rgba(248,240,232,0.4)' }}>
            Staff
          </p>
        </div>
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium transition-opacity hover:opacity-70 disabled:opacity-50"
          style={{ color: 'rgba(248,240,232,0.6)' }}
        >
          <LogOut className="size-4 shrink-0" />
          {isLoggingOut ? '…' : tAuth('logout')}
        </button>
      </div>
    </aside>
  )
}
