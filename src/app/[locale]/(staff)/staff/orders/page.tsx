'use client'

import { useState, useEffect } from 'react'
import { Radio, ClipboardList } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { StaffOrderCard, type StaffOrder } from '@/components/staff/order-card'
import { OrderStatusBadge } from '@/components/guest/order-status-badge'
import { getStaffOrdersAction } from '@/lib/actions/room-service'
import { useAuthStore } from '@/lib/store/auth-store'
import { createClient } from '@/lib/supabase/client'
import type { OrderStatus } from '@/lib/actions/room-service'

type FilterTab = 'all' | 'pending' | 'active' | 'completed'

const ACTIVE_STATUSES: OrderStatus[] = ['confirmed', 'preparing', 'delivering']

function matchesFilter(status: OrderStatus, filter: FilterTab): boolean {
  if (filter === 'all') return true
  if (filter === 'pending') return status === 'pending'
  if (filter === 'active') return ACTIVE_STATUSES.includes(status)
  if (filter === 'completed') return status === 'delivered' || status === 'cancelled'
  return true
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapOrder(o: any): StaffOrder {
  return {
    id: o.id,
    status: o.status as OrderStatus,
    total_amount: o.total_amount,
    notes: o.notes ?? null,
    created_at: o.created_at,
    order_items: (o.order_items ?? []).map((oi: { id: string; quantity: number; unit_price: number; menu_items: { name: string } | null }) => ({
      id: oi.id,
      quantity: oi.quantity,
      unit_price: oi.unit_price,
      menu_items: oi.menu_items ? { name: oi.menu_items.name } : null,
    })),
    stays: o.stays
      ? { rooms: o.stays.rooms ? { number: o.stays.rooms.number, type: o.stays.rooms.type } : null }
      : null,
    profiles: o.profiles ? { full_name: o.profiles.full_name } : null,
  }
}

function StatusPill({ status, count }: { status: OrderStatus; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <OrderStatusBadge status={status} />
      <span
        className="flex size-5 items-center justify-center rounded-full text-[10px] font-bold"
        style={{ background: '#1B2D5B', color: '#F8F0E8' }}
      >
        {count}
      </span>
    </div>
  )
}

function OrderCardSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-2xl bg-white"
      style={{ boxShadow: '0 2px 16px rgba(27,45,91,0.08)' }}
    >
      <div className="space-y-3 px-5 py-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <div className="h-4 w-28 animate-pulse rounded-lg" style={{ background: '#EEE4D8' }} />
            <div className="h-3 w-36 animate-pulse rounded-lg" style={{ background: '#EEE4D8' }} />
          </div>
          <div className="h-7 w-20 animate-pulse rounded-full" style={{ background: '#EEE4D8' }} />
        </div>
        <div className="h-px" style={{ background: '#EEE4D8' }} />
        <div className="h-3 w-20 animate-pulse rounded-lg" style={{ background: '#EEE4D8' }} />
        <div className="h-px" style={{ background: '#EEE4D8' }} />
        <div className="flex gap-2">
          <div className="h-10 flex-1 animate-pulse rounded-xl" style={{ background: '#EEE4D8' }} />
          <div className="h-10 w-20 animate-pulse rounded-xl" style={{ background: '#EEE4D8' }} />
        </div>
      </div>
    </div>
  )
}

export default function StaffOrdersPage() {
  const { profile } = useAuthStore()
  const t = useTranslations('staff.orders')
  const tStatus = useTranslations('status')
  const [orders, setOrders] = useState<StaffOrder[]>([])
  const [filter, setFilter] = useState<FilterTab>('all')
  const [loading, setLoading] = useState(true)

  const FILTER_TABS: { key: FilterTab; label: string }[] = [
    { key: 'all',       label: t('title')           }, // TODO: i18n — no "All Orders" key
    { key: 'pending',   label: tStatus('pending')   },
    { key: 'active',    label: tStatus('active')    },
    { key: 'completed', label: tStatus('completed') },
  ]

  // Initial data load
  useEffect(() => {
    async function load() {
      setLoading(true)
      const { orders: raw } = await getStaffOrdersAction()
      setOrders((raw ?? []).map(mapOrder))
      setLoading(false)
    }
    load()
  }, [])

  // Real-time subscription keyed on hotel_id from auth store
  useEffect(() => {
    const hotelId = profile?.hotel_id
    if (!hotelId) return

    const supabase = createClient()
    const channel = supabase
      .channel(`hotel-orders:${hotelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `hotel_id=eq.${hotelId}`,
        },
        async () => {
          // Refetch all to get joined room/guest data for the new order
          const { orders: raw } = await getStaffOrdersAction()
          setOrders((raw ?? []).map(mapOrder))
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `hotel_id=eq.${hotelId}`,
        },
        (payload) => {
          const updated = payload.new as { id: string; status: OrderStatus }
          setOrders((prev) =>
            prev.map((o) =>
              o.id === updated.id ? { ...o, status: updated.status } : o
            )
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.hotel_id])

  const filtered = orders.filter((o) => matchesFilter(o.status, filter))
  const pendingCount = orders.filter((o) => o.status === 'pending').length
  const activeCount = orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length

  function handleStatusChange(id: string, newStatus: OrderStatus) {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o))
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#F8F0E8' }}>
      {/* Page header */}
      <div
        className="sticky top-0 z-20 border-b px-6 py-5"
        style={{ background: '#F8F0E8', borderColor: 'rgba(27,45,91,0.08)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: '#C9A84C' }}
            >
              Operations
            </p>
            <h1 className="font-heading text-2xl font-bold" style={{ color: '#1B2D5B' }}>
              {t('title')}
            </h1>
          </div>
          {/* Live indicator */}
          <div
            className="flex items-center gap-2 rounded-full px-3 py-1.5"
            style={{ background: 'rgba(34,197,94,0.1)' }}
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-green-500" />
            </span>
            <span className="text-xs font-semibold" style={{ color: '#166534' }}>
              Live
            </span>
          </div>
        </div>

        {/* Summary pills */}
        {!loading && (pendingCount > 0 || activeCount > 0) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {pendingCount > 0 && <StatusPill status="pending" count={pendingCount} />}
            {activeCount > 0 && <StatusPill status="preparing" count={activeCount} />}
          </div>
        )}

        {/* Filter tabs */}
        <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className="shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-150"
              style={
                filter === tab.key
                  ? { background: '#1B2D5B', color: '#F8F0E8' }
                  : { background: 'rgba(27,45,91,0.07)', color: '#1B2D5B' }
              }
            >
              {tab.label}
              {tab.key === 'pending' && pendingCount > 0 && (
                <span
                  className="ml-1.5 rounded-full px-1.5 py-0.5 text-[10px]"
                  style={{ background: '#C9A84C', color: '#FFFFFF' }}
                >
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <OrderCardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div
              className="mb-4 flex size-16 items-center justify-center rounded-2xl"
              style={{ background: 'rgba(27,45,91,0.06)' }}
            >
              <ClipboardList className="size-8" style={{ color: '#7A8BA8' }} />
            </div>
            <p
              className="font-heading text-lg font-semibold"
              style={{ color: '#1B2D5B' }}
            >
              {t('empty')}
            </p>
            <p className="mt-1 text-sm" style={{ color: '#7A8BA8' }}>
              {/* TODO: i18n */}
              {filter === 'pending' ? 'All caught up!' : 'Nothing to show for this filter.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((order) => (
              <StaffOrderCard
                key={order.id}
                order={order}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
