'use client'

import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import { Home, UtensilsCrossed, ClipboardList, Bell, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { key: 'home',     href: '/dashboard', icon: Home,            label: 'Home'     },
  { key: 'menu',     href: '/menu',      icon: UtensilsCrossed, label: 'Menu'     },
  { key: 'orders',   href: '/orders',    icon: ClipboardList,   label: 'Orders'   },
  { key: 'requests', href: '/requests',  icon: Bell,            label: 'Requests' },
  { key: 'chat',     href: '/chat',      icon: MessageCircle,   label: 'Chat'     },
]

export function BottomNav() {
  const pathname = usePathname()
  const params = useParams()
  const locale = typeof params.locale === 'string' ? params.locale : 'en'

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t px-2"
      style={{
        background: '#FFFFFF',
        borderColor: 'rgba(27, 45, 91, 0.1)',
        height: '64px',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {navItems.map(({ key, href, icon: Icon, label }) => {
        const fullHref = `/${locale}${href}`
        const isActive = pathname.startsWith(fullHref)

        return (
          <Link
            key={key}
            href={fullHref}
            className={cn(
              'flex min-h-[48px] min-w-[60px] flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-2 transition-all duration-200',
              isActive
                ? 'text-[#C9A84C]'
                : 'text-[#7A8BA8] hover:text-[#1B2D5B]'
            )}
          >
            <Icon
              className={cn(
                'transition-all duration-200',
                isActive ? 'size-[22px] stroke-[2.5]' : 'size-[20px] stroke-[1.8]'
              )}
            />
            <span
              className={cn(
                'text-[10px] font-medium tracking-wide transition-all duration-200',
                isActive ? 'opacity-100' : 'opacity-70'
              )}
            >
              {label}
            </span>
            {isActive && (
              <span
                className="mt-0.5 h-0.5 w-4 rounded-full"
                style={{ background: '#C9A84C' }}
              />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
