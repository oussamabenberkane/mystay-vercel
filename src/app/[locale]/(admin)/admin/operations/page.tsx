import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { defaultLocale } from '@/lib/i18n/config'
import { getTranslations } from 'next-intl/server'
import {
  BedDouble,
  ShoppingBag,
  Clock,
  Bell,
  DollarSign,
} from 'lucide-react'
import { StatsCard } from '@/components/admin/stats-card'
import { OrderStatusBadge } from '@/components/guest/order-status-badge'
import { RequestStatusBadge } from '@/components/shared/request-status-badge'
import { PriorityBadge } from '@/components/shared/priority-badge'
import { RefreshButton } from './_components/refresh-button'
import { AutoRefresh } from './_components/auto-refresh'
import { formatCurrency } from '@/lib/utils/format'

type HotelStats = {
  active_stays: number
  orders_today: number
  pending_orders: number
  pending_requests: number
  revenue_today: number
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default async function OperationsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('admin.operations')
  const tRequests = await getTranslations('guest.requests')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale ?? defaultLocale}/login`)

  const { data: profileData } = await supabase
    .from('profiles')
    .select('hotel_id, role')
    .eq('id', user.id)
    .single()

  const profile = profileData as { hotel_id: string; role: string } | null
  if (!profile || profile.role !== 'admin') redirect(`/${locale ?? defaultLocale}/login`)

  const hotelId = profile.hotel_id

  const [statsResult, ordersResult, requestsResult] = await Promise.all([
    (supabase as any).rpc('get_hotel_stats', { p_hotel_id: hotelId }),
    supabase
      .from('orders')
      .select('id, status, total_amount, created_at, stays(rooms(number)), profiles!guest_id(full_name)')
      .eq('hotel_id', hotelId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('service_requests')
      .select('id, type, priority, status, created_at, stays(rooms(number)), profiles!guest_id(full_name)')
      .eq('hotel_id', hotelId)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const stats = (statsResult.data as HotelStats | null) ?? {
    active_stays: 0,
    orders_today: 0,
    pending_orders: 0,
    pending_requests: 0,
    revenue_today: 0,
  }

  const orders = (ordersResult.data ?? []) as any[]
  const requests = (requestsResult.data ?? []) as any[]

  return (
    <div className="p-6 md:p-8 space-y-8">
      <AutoRefresh />
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#C9A84C' }}>
            {/* TODO: i18n */}
            Live Overview
          </p>
          <h1 className="font-heading text-3xl font-bold" style={{ color: '#1B2D5B' }}>
            {t('title')}
          </h1>
        </div>
        <RefreshButton />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Active Stays"
          value={stats.active_stays}
          icon={BedDouble}
          subtitle="guests checked in"
        />
        <StatsCard
          title="Orders Today"
          value={stats.orders_today}
          icon={ShoppingBag}
          subtitle="room service orders"
        />
        <StatsCard
          title="Pending Orders"
          value={stats.pending_orders}
          icon={Clock}
          variant={stats.pending_orders > 0 ? 'danger' : 'default'}
          badge={stats.pending_orders > 0 ? stats.pending_orders : undefined}
        />
        <StatsCard
          title="Revenue Today"
          value={formatCurrency(stats.revenue_today)}
          icon={DollarSign}
          variant="warning"
          subtitle="from room service"
        />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="card-warm overflow-hidden">
          <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(27,45,91,0.06)' }}>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#C9A84C' }}>
              Recent Activity
            </p>
            <h2 className="font-heading text-lg font-semibold mt-0.5" style={{ color: '#1B2D5B' }}>
              Room Service Orders
            </h2>
          </div>

          {orders.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm" style={{ color: '#7A8BA8' }}>No orders yet today</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'rgba(27,45,91,0.05)' }}>
              {orders.map((order) => {
                const roomNumber = order.stays?.rooms?.number ?? '—'
                const guestName = order.profiles?.full_name ?? 'Unknown'
                return (
                  <div
                    key={order.id}
                    className="px-6 py-3.5 flex items-center gap-4 transition-colors hover:bg-[rgba(248,240,232,0.6)]"
                  >
                    <div
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                      style={{ background: 'rgba(27,45,91,0.06)', color: '#1B2D5B' }}
                    >
                      {roomNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#1B2D5B' }}>
                        {guestName}
                      </p>
                      <p className="text-xs" style={{ color: '#7A8BA8' }}>
                        {timeAgo(order.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <OrderStatusBadge status={order.status} />
                      <span className="text-sm font-semibold" style={{ color: '#1B2D5B' }}>
                        {formatCurrency(order.total_amount)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent Service Requests */}
        <div className="card-warm overflow-hidden">
          <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(27,45,91,0.06)' }}>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#C9A84C' }}>
              Recent Activity
            </p>
            <h2 className="font-heading text-lg font-semibold mt-0.5" style={{ color: '#1B2D5B' }}>
              Service Requests
            </h2>
          </div>

          {requests.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm" style={{ color: '#7A8BA8' }}>No service requests</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'rgba(27,45,91,0.05)' }}>
              {requests.map((req) => {
                const roomNumber = req.stays?.rooms?.number ?? '—'
                const guestName = req.profiles?.full_name ?? 'Unknown'
                const typeLabel = ['cleaning', 'towels', 'maintenance', 'other'].includes(req.type)
                  ? tRequests(req.type)
                  : req.type
                return (
                  <div
                    key={req.id}
                    className="px-6 py-3.5 flex items-center gap-4 transition-colors hover:bg-[rgba(248,240,232,0.6)]"
                  >
                    <div
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                      style={{ background: 'rgba(27,45,91,0.06)', color: '#1B2D5B' }}
                    >
                      {roomNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#1B2D5B' }}>
                        {typeLabel}
                      </p>
                      <p className="text-xs" style={{ color: '#7A8BA8' }}>
                        {guestName} · {timeAgo(req.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <PriorityBadge priority={req.priority} />
                      <RequestStatusBadge status={req.status} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
