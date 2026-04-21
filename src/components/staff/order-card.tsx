'use client'

import { useState } from 'react'
import { Clock, User, MapPin, ChevronDown, ChevronUp } from 'lucide-react'
import { OrderStatusBadge } from '@/components/guest/order-status-badge'
import { updateOrderStatusAction, type OrderStatus } from '@/lib/actions/room-service'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils/format'

type OrderItem = {
  id: string
  quantity: number
  unit_price: number
  menu_items: { name: string } | null
}

export type StaffOrder = {
  id: string
  status: OrderStatus
  total_amount: number
  notes: string | null
  created_at: string
  order_items: OrderItem[]
  stays: {
    rooms: { number: string; type: string } | null
  } | null
  profiles: { full_name: string } | null
}

const STATUS_TRANSITIONS: Record<OrderStatus, { label: string; next: OrderStatus } | null> = {
  pending:    { label: 'Confirm Order',    next: 'confirmed'  },
  confirmed:  { label: 'Start Preparing',  next: 'preparing'  },
  preparing:  { label: 'Out for Delivery', next: 'delivering' },
  delivering: { label: 'Mark Delivered',   next: 'delivered'  },
  delivered:  null,
  cancelled:  null,
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function StaffOrderCard({
  order,
  onStatusChange,
}: {
  order: StaffOrder
  onStatusChange: (id: string, status: OrderStatus) => void
}) {
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const transition = STATUS_TRANSITIONS[order.status]
  const roomNumber = order.stays?.rooms?.number ?? '–'
  const guestName = order.profiles?.full_name ?? 'Guest'

  async function handleAdvance() {
    if (!transition) return
    setLoading(true)
    const { error } = await updateOrderStatusAction(order.id, transition.next)
    if (!error) onStatusChange(order.id, transition.next)
    setLoading(false)
  }

  async function handleCancel() {
    if (!confirm('Cancel this order?')) return
    setLoading(true)
    const { error } = await updateOrderStatusAction(order.id, 'cancelled')
    if (!error) onStatusChange(order.id, 'cancelled')
    setLoading(false)
  }

  const isTerminal = order.status === 'delivered' || order.status === 'cancelled'

  return (
    <div
      className="overflow-hidden rounded-2xl bg-white"
      style={{ boxShadow: '0 2px 16px rgba(27,45,91,0.08)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className="font-heading text-base font-semibold"
              style={{ color: '#1B2D5B' }}
            >
              #{order.id.slice(-6).toUpperCase()}
            </span>
            <OrderStatusBadge status={order.status} />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: '#7A8BA8' }}>
            <span className="flex items-center gap-1">
              <MapPin className="size-3" />
              Room {roomNumber}
            </span>
            <span className="flex items-center gap-1">
              <User className="size-3" />
              {guestName}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {timeAgo(order.created_at)}
            </span>
          </div>
        </div>
        <span className="font-heading text-xl font-bold" style={{ color: '#C9A84C' }}>
          {formatCurrency(order.total_amount)}
        </span>
      </div>

      {/* Items preview / expand */}
      <div
        className="mx-5 border-t pb-4"
        style={{ borderColor: 'rgba(27,45,91,0.07)' }}
      >
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-between pt-3 text-xs font-medium"
          style={{ color: '#7A8BA8' }}
        >
          <span>{order.order_items.length} item{order.order_items.length !== 1 ? 's' : ''}</span>
          {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </button>

        {expanded && (
          <ul className="mt-2 space-y-1.5">
            {order.order_items.map((item) => (
              <li key={item.id} className="flex justify-between text-sm">
                <span style={{ color: '#1B2D5B' }}>
                  {item.quantity}× {item.menu_items?.name ?? 'Item'}
                </span>
                <span style={{ color: '#7A8BA8' }}>
                  {formatCurrency(item.unit_price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {order.notes && (
          <p
            className="mt-2 rounded-xl px-3 py-2 text-xs italic"
            style={{ background: '#F8F0E8', color: '#7A8BA8' }}
          >
            Note: {order.notes}
          </p>
        )}
      </div>

      {/* Actions */}
      {!isTerminal && (
        <div
          className="flex gap-2 border-t px-5 py-4"
          style={{ borderColor: 'rgba(27,45,91,0.07)' }}
        >
          {transition && (
            <button
              onClick={handleAdvance}
              disabled={loading}
              className={cn(
                'flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all duration-150 active:scale-[0.98] disabled:opacity-60'
              )}
              style={{ background: '#1B2D5B', color: '#F8F0E8' }}
            >
              {loading ? '...' : transition.label}
            </button>
          )}
          <button
            onClick={handleCancel}
            disabled={loading}
            className="rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-150 active:scale-[0.98] disabled:opacity-60"
            style={{ borderColor: 'rgba(27,45,91,0.15)', color: '#7A8BA8' }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
