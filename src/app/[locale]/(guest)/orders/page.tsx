'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ClipboardList, ChevronDown, ChevronUp } from 'lucide-react'
import { OrderStatusBadge } from '@/components/guest/order-status-badge'
import { getActiveStayAction, getOrdersForStayAction } from '@/lib/actions/room-service'
import { createClient } from '@/lib/supabase/client'
import type { OrderStatus } from '@/lib/actions/room-service'

type OrderItem = {
  id: string
  quantity: number
  unit_price: number
  name: string
}

type Order = {
  id: string
  status: OrderStatus
  total_amount: number
  notes: string | null
  created_at: string
  items: OrderItem[]
}

const PROGRESS_STEPS: { key: OrderStatus; label: string }[] = [
  { key: 'pending', label: 'Placed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'delivering', label: 'On the way' },
]

function OrderProgress({ status }: { status: OrderStatus }) {
  if (status === 'cancelled' || status === 'delivered') return null
  const currentIdx = PROGRESS_STEPS.findIndex((s) => s.key === status)
  if (currentIdx === -1) return null
  const pct = (currentIdx / (PROGRESS_STEPS.length - 1)) * 100

  return (
    <div className="mt-4 pb-1">
      <div className="relative flex justify-between">
        {/* Track */}
        <div
          className="absolute left-1.5 right-1.5 top-1.25 h-0.5"
          style={{ background: '#EEE4D8' }}
        >
          <div
            className="h-full transition-all duration-700"
            style={{ background: '#C9A84C', width: `${pct}%` }}
          />
        </div>

        {PROGRESS_STEPS.map((step, i) => {
          const done = i <= currentIdx
          const current = i === currentIdx
          return (
            <div key={step.key} className="relative flex flex-col items-center">
              <div className="relative size-3">
                {current && (
                  <span
                    className="absolute inset-0 animate-ping rounded-full"
                    style={{ background: 'rgba(201,168,76,0.35)' }}
                  />
                )}
                <span
                  className="relative block size-3 rounded-full"
                  style={{
                    background: done ? '#C9A84C' : '#EEE4D8',
                    boxShadow: current ? '0 0 0 3px rgba(201,168,76,0.18)' : 'none',
                  }}
                />
              </div>
              <span
                className="mt-1.5 w-14 text-center text-[9px] font-semibold leading-tight"
                style={{ color: done ? '#92600A' : '#B0BEC5' }}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function timeLabel(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return isToday
    ? `Today at ${time}`
    : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ` at ${time}`
}

function OrderSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-2xl bg-white"
      style={{ boxShadow: '0 2px 16px rgba(27,45,91,0.08)' }}
    >
      <div className="h-1 animate-pulse" style={{ background: '#EEE4D8' }} />
      <div className="space-y-3 px-5 py-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <div className="h-4 w-32 animate-pulse rounded-lg" style={{ background: '#EEE4D8' }} />
            <div className="h-3 w-24 animate-pulse rounded-lg" style={{ background: '#EEE4D8' }} />
          </div>
          <div className="h-6 w-24 animate-pulse rounded-full" style={{ background: '#EEE4D8' }} />
        </div>
        <div className="mt-3 h-0.5" style={{ background: '#EEE4D8' }} />
        <div className="flex justify-between">
          <div className="h-3 w-16 animate-pulse rounded-lg" style={{ background: '#EEE4D8' }} />
          <div className="h-5 w-20 animate-pulse rounded-lg" style={{ background: '#EEE4D8' }} />
        </div>
      </div>
    </div>
  )
}

function OrderCard({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(false)
  const isActive =
    order.status !== 'delivered' && order.status !== 'cancelled'

  const accentColor =
    order.status === 'delivered'
      ? '#22C55E'
      : order.status === 'cancelled'
      ? '#EF4444'
      : order.status === 'preparing' || order.status === 'delivering'
      ? '#F97316'
      : '#C9A84C'

  return (
    <div
      className="overflow-hidden rounded-2xl bg-white"
      style={{ boxShadow: '0 2px 16px rgba(27,45,91,0.08)' }}
    >
      {/* Status accent bar */}
      <div className="h-1" style={{ background: accentColor }} />

      <div className="px-5 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p
              className="font-heading text-base font-semibold"
              style={{ color: '#1B2D5B' }}
            >
              Order #{order.id.slice(-8).toUpperCase()}
            </p>
            <p className="mt-0.5 text-xs" style={{ color: '#7A8BA8' }}>
              {timeLabel(order.created_at)}
            </p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>

        {/* Progress timeline for active orders */}
        {isActive && <OrderProgress status={order.status} />}

        <div
          className="mt-3 flex items-center justify-between border-t pt-3"
          style={{ borderColor: 'rgba(27,45,91,0.07)' }}
        >
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium"
            style={{ color: '#7A8BA8' }}
          >
            {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
            {expanded ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
          </button>
          <span
            className="font-heading text-lg font-bold"
            style={{ color: '#C9A84C' }}
          >
            €{order.total_amount.toFixed(2)}
          </span>
        </div>

        {expanded && (
          <ul className="mt-2 space-y-1.5 pb-1">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between text-sm">
                <span style={{ color: '#1B2D5B' }}>
                  {item.quantity}× {item.name}
                </span>
                <span style={{ color: '#7A8BA8' }}>
                  €{(item.unit_price * item.quantity).toFixed(2)}
                </span>
              </li>
            ))}
            {order.notes && (
              <li
                className="mt-2 rounded-xl px-3 py-2 text-xs italic"
                style={{ background: '#F8F0E8', color: '#7A8BA8' }}
              >
                Note: {order.notes}
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  )
}

export default function GuestOrdersPage() {
  const params = useParams()
  const locale = typeof params.locale === 'string' ? params.locale : 'en'

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [stayId, setStayId] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const { stay } = await getActiveStayAction()
      if (!stay) {
        setLoading(false)
        return
      }
      setStayId(stay.id)

      const { orders: raw } = await getOrdersForStayAction(stay.id)
      const mapped: Order[] = (raw ?? []).map(
        (o: {
          id: string
          status: OrderStatus
          total_amount: number
          notes: string | null
          created_at: string
          order_items: { id: string; quantity: number; unit_price: number; menu_items: { name: string } | null }[]
        }) => ({
          id: o.id,
          status: o.status,
          total_amount: o.total_amount,
          notes: o.notes,
          created_at: o.created_at,
          items: (o.order_items ?? []).map((oi) => ({
            id: oi.id,
            quantity: oi.quantity,
            unit_price: oi.unit_price,
            name: oi.menu_items?.name ?? 'Item',
          })),
        })
      )
      setOrders(mapped)
      setLoading(false)
    }
    init()
  }, [])

  // Real-time: subscribe to order status updates for this stay
  useEffect(() => {
    if (!stayId) return
    const supabase = createClient()
    const channel = supabase
      .channel(`orders:${stayId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `stay_id=eq.${stayId}`,
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
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `stay_id=eq.${stayId}`,
        },
        async () => {
          // Refetch all orders to pick up the new one with its items
          const { orders: raw } = await getOrdersForStayAction(stayId)
          const mapped: Order[] = (raw ?? []).map(
            (o: {
              id: string
              status: OrderStatus
              total_amount: number
              notes: string | null
              created_at: string
              order_items: { id: string; quantity: number; unit_price: number; menu_items: { name: string } | null }[]
            }) => ({
              id: o.id,
              status: o.status,
              total_amount: o.total_amount,
              notes: o.notes,
              created_at: o.created_at,
              items: (o.order_items ?? []).map((oi) => ({
                id: oi.id,
                quantity: oi.quantity,
                unit_price: oi.unit_price,
                name: oi.menu_items?.name ?? 'Item',
              })),
            })
          )
          setOrders(mapped)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [stayId])

  return (
    <div className="min-h-screen" style={{ background: '#F8F0E8' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-30 border-b px-4 py-4"
        style={{ background: '#F8F0E8', borderColor: 'rgba(27,45,91,0.08)' }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: '#C9A84C' }}
        >
          Room Service
        </p>
        <h1
          className="font-heading text-2xl font-bold leading-tight"
          style={{ color: '#1B2D5B' }}
        >
          My Orders
        </h1>
      </div>

      <div className="px-4 py-6">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <OrderSkeleton key={i} />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div
              className="mb-5 flex size-20 items-center justify-center rounded-3xl"
              style={{ background: 'rgba(27,45,91,0.06)' }}
            >
              <ClipboardList className="size-9" style={{ color: '#7A8BA8' }} />
            </div>
            <h2
              className="font-heading text-xl font-semibold"
              style={{ color: '#1B2D5B' }}
            >
              No orders yet
            </h2>
            <p className="mt-2 text-center text-sm" style={{ color: '#7A8BA8' }}>
              Browse our menu and place your first order.
            </p>
            <Link
              href={`/${locale}/menu`}
              className="mt-8 rounded-2xl px-8 py-3.5 text-sm font-semibold transition-all active:scale-[0.98]"
              style={{ background: '#1B2D5B', color: '#F8F0E8' }}
            >
              Browse Menu
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
