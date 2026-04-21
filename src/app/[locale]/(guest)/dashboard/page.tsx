import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { defaultLocale } from '@/lib/i18n/config'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import {
  UtensilsCrossed,
  Bell,
  MessageCircle,
  Receipt,
  BedDouble,
  Calendar,
} from 'lucide-react'
import { OrderStatusBadge } from '@/components/guest/order-status-badge'
import { GuestSignOutButton } from '../_components/sign-out-button'
import { formatCurrency } from '@/lib/utils/format'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function GuestDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('guest.dashboard')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale ?? defaultLocale}/login`)

  const { data: profileData } = await supabase
    .from('profiles')
    .select('full_name, hotel_id')
    .eq('id', user.id)
    .single()

  const profile = profileData as { full_name: string; hotel_id: string } | null
  if (!profile) redirect(`/${locale ?? defaultLocale}/login`)

  const stayResult = await (supabase as any).rpc('get_active_stay', { p_guest_id: user.id })
  const activeStay = stayResult.data?.[0] ?? null

  const [ordersResult, expensesResult] = await Promise.all([
    activeStay
      ? supabase
          .from('orders')
          .select('id, status, total_amount, created_at')
          .eq('stay_id', activeStay.id)
          .order('created_at', { ascending: false })
          .limit(3)
      : Promise.resolve({ data: [] }),
    supabase
      .from('expenses')
      .select('amount')
      .eq('guest_id', user.id),
  ])

  const recentOrders = (ordersResult.data ?? []) as any[]
  const totalExpenses = ((expensesResult.data ?? []) as any[]).reduce(
    (sum, e) => sum + (e.amount ?? 0),
    0
  )

  const firstName = profile.full_name.split(' ')[0]

  // TODO: i18n — quick action labels/descriptions have no matching translation keys
  const quickActions = [
    { href: '/menu', label: 'Room Service', icon: UtensilsCrossed, description: 'Order food & drinks' },
    { href: '/requests', label: 'Request Service', icon: Bell, description: 'Housekeeping & more' },
    { href: '/chat', label: 'Chat', icon: MessageCircle, description: 'Message reception' },
    { href: '/expenses', label: 'My Bill', icon: Receipt, description: 'View charges' },
  ]

  return (
    <div className="min-h-screen pb-24" style={{ background: '#F8F0E8' }}>
      <div className="px-4 pt-8 pb-6 max-w-2xl mx-auto space-y-6">

        {/* Welcome card */}
        <div
          className="rounded-3xl p-6 relative overflow-hidden"
          style={{ background: '#1B2D5B' }}
        >
          <div
            className="pointer-events-none absolute -top-8 -right-8 size-36 rounded-full opacity-10"
            style={{ background: '#C9A84C' }}
          />
          <div
            className="pointer-events-none absolute top-12 -right-4 size-20 rounded-full opacity-5"
            style={{ background: '#C9A84C' }}
          />

          <div className="flex items-start justify-between mb-1">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#C9A84C' }}>
              {t('welcome')}
            </p>
            <GuestSignOutButton />
          </div>
          <h1 className="font-heading text-2xl font-bold mb-4" style={{ color: '#F8F0E8' }}>
            {firstName}!
          </h1>

          {activeStay ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <BedDouble className="size-4 shrink-0" style={{ color: '#C9A84C' }} />
                <span className="text-sm font-medium" style={{ color: 'rgba(248,240,232,0.9)' }}>
                  {t('room')} {activeStay.room_number}
                </span>
                <span className="text-xs" style={{ color: 'rgba(248,240,232,0.5)' }}>
                  · {activeStay.room_type}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="size-4 shrink-0" style={{ color: '#C9A84C' }} />
                <span className="text-sm" style={{ color: 'rgba(248,240,232,0.75)' }}>
                  {t('checkIn')}: {formatDate(activeStay.check_in)} → {t('checkOut')}: {formatDate(activeStay.check_out)}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'rgba(248,240,232,0.6)' }}>
              {/* TODO: i18n */}
              No active stay — contact reception for assistance.
            </p>
          )}
        </div>

        {/* Total expenses summary */}
        {totalExpenses > 0 && (
          <div
            className="rounded-2xl px-5 py-4 flex items-center justify-between"
            style={{ background: 'rgba(201,168,76,0.1)', border: '1.5px solid rgba(201,168,76,0.2)' }}
          >
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#C9A84C' }}>
                {/* TODO: i18n */}
                Current Balance
              </p>
              <p className="font-heading text-2xl font-bold mt-0.5" style={{ color: '#1B2D5B' }}>
                {formatCurrency(totalExpenses)}
              </p>
            </div>
            <Link
              href={`/${locale}/expenses`}
              className="text-xs font-semibold rounded-xl px-4 py-2 transition-colors"
              style={{ background: '#C9A84C', color: '#1B2D5B' }}
            >
              {/* TODO: i18n */}
              View Bill
            </Link>
          </div>
        )}

        {/* Quick actions */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: '#7A8BA8' }}>
            {t('quickActions')}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map(({ href, label, icon: Icon, description }) => (
              <Link
                key={href}
                href={`/${locale}${href}`}
                className="card-warm p-4 group block transition-all hover:shadow-lg"
              >
                <div
                  className="flex size-10 items-center justify-center rounded-xl mb-3"
                  style={{ background: 'rgba(27,45,91,0.06)' }}
                >
                  <Icon className="size-5" style={{ color: '#1B2D5B' }} strokeWidth={1.8} />
                </div>
                <p className="font-semibold text-sm" style={{ color: '#1B2D5B' }}>
                  {label}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#7A8BA8' }}>
                  {description}
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent orders */}
        {recentOrders.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#7A8BA8' }}>
                {/* TODO: i18n */}
                Recent Orders
              </p>
              <Link
                href={`/${locale}/orders`}
                className="text-xs font-medium"
                style={{ color: '#C9A84C' }}
              >
                {/* TODO: i18n */}
                View all
              </Link>
            </div>
            <div className="card-warm divide-y" style={{ borderColor: 'rgba(27,45,91,0.05)' }}>
              {recentOrders.map((order) => (
                <div key={order.id} className="px-5 py-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#1B2D5B' }}>
                      Order #{order.id.slice(-6).toUpperCase()}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#7A8BA8' }}>
                      {new Date(order.created_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <OrderStatusBadge status={order.status} />
                    <span className="text-sm font-semibold" style={{ color: '#1B2D5B' }}>
                      {formatCurrency(order.total_amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No active stay CTA */}
        {!activeStay && (
          <div className="card-warm p-6 text-center">
            <BedDouble className="size-10 mx-auto mb-3" style={{ color: '#C9A84C', opacity: 0.6 }} />
            <p className="font-heading text-lg font-semibold" style={{ color: '#1B2D5B' }}>
              {/* TODO: i18n */}
              No Active Stay
            </p>
            <p className="text-sm mt-1" style={{ color: '#7A8BA8' }}>
              {/* TODO: i18n */}
              Please contact hotel reception to get checked in.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
