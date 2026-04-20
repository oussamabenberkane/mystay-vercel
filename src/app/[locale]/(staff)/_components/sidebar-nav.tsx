'use client'

import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import { ClipboardList, Bell, MessageCircle, LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/staff/orders',   icon: ClipboardList,   label: 'Orders'   },
  { href: '/staff/requests', icon: Bell,             label: 'Requests' },
  { href: '/staff/chat',     icon: MessageCircle,   label: 'Chat'     },
]

export function StaffSidebarNav() {
  const pathname = usePathname()
  const params = useParams()
  const locale = typeof params.locale === 'string' ? params.locale : 'en'

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

      {/* Footer */}
      <div className="px-6 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <p className="text-[11px]" style={{ color: 'rgba(248,240,232,0.35)' }}>
          © My Stay Platform
        </p>
      </div>
    </aside>
  )
}
