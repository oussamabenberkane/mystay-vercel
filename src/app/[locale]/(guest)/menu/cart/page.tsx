'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trash2, Plus, Minus, ShoppingBag, MapPin } from 'lucide-react'
import { useCartStore } from '@/lib/store/cart-store'
import { placeOrderAction, getActiveStayAction } from '@/lib/actions/room-service'

type ActiveStay = {
  id: string
  hotel_id: string
  room_number: string
  room_type: string
}

export default function CartPage() {
  const router = useRouter()
  const params = useParams()
  const locale = typeof params.locale === 'string' ? params.locale : 'en'

  const { items, updateQuantity, removeItem, total, clearCart } = useCartStore()
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [stayLoading, setStayLoading] = useState(true)
  const [stay, setStay] = useState<ActiveStay | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadStay() {
      setStayLoading(true)
      const { stay: activeStay, error: stayError } = await getActiveStayAction()
      if (stayError && stayError !== 'Not authenticated') {
        setError(stayError)
      } else if (activeStay) {
        setStay(activeStay)
      }
      setStayLoading(false)
    }
    loadStay()
  }, [])

  async function handlePlaceOrder() {
    if (items.length === 0 || !stay) return
    setLoading(true)
    setError(null)
    try {
      const orderItems = items.map((item) => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice: item.price,
      }))
      const { orderId, error: orderError } = await placeOrderAction(orderItems, notes, stay.id)
      if (orderError) {
        setError(orderError)
        return
      }
      if (orderId) {
        clearCart()
        router.push(`/${locale}/orders`)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center px-4"
        style={{ background: '#F8F0E8' }}
      >
        <div
          className="mb-6 flex size-20 items-center justify-center rounded-3xl"
          style={{ background: 'rgba(27,45,91,0.06)' }}
        >
          <ShoppingBag className="size-9" style={{ color: '#7A8BA8' }} />
        </div>
        <h2
          className="font-heading text-2xl font-semibold"
          style={{ color: '#1B2D5B' }}
        >
          Your cart is empty
        </h2>
        <p className="mt-2 text-center text-sm" style={{ color: '#7A8BA8' }}>
          Browse our menu and add something delicious.
        </p>
        <Link
          href={`/${locale}/menu`}
          className="mt-8 rounded-2xl px-8 py-3.5 text-sm font-semibold transition-all duration-150 active:scale-[0.98]"
          style={{ background: '#1B2D5B', color: '#F8F0E8' }}
        >
          Browse Menu
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#F8F0E8' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-30 flex items-center gap-3 border-b px-4 py-4"
        style={{ background: '#F8F0E8', borderColor: 'rgba(27,45,91,0.08)' }}
      >
        <Link
          href={`/${locale}/menu`}
          className="flex size-9 items-center justify-center rounded-xl transition-all"
          style={{ background: 'rgba(27,45,91,0.07)', color: '#1B2D5B' }}
        >
          <ArrowLeft className="size-4.5" />
        </Link>
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: '#C9A84C' }}
          >
            Review
          </p>
          <h1
            className="font-heading text-xl font-bold leading-tight"
            style={{ color: '#1B2D5B' }}
          >
            Your Order
          </h1>
        </div>
      </div>

      <div className="space-y-3 px-4 py-6">
        {/* Room indicator */}
        {stayLoading ? (
          <div
            className="h-12 animate-pulse rounded-2xl"
            style={{ background: '#EEE4D8' }}
          />
        ) : stay ? (
          <div
            className="flex items-center gap-3 rounded-2xl px-5 py-3"
            style={{ background: 'rgba(27,45,91,0.04)', border: '1px solid rgba(27,45,91,0.08)' }}
          >
            <MapPin className="size-4 shrink-0" style={{ color: '#C9A84C' }} />
            <div>
              <p className="text-xs font-semibold" style={{ color: '#7A8BA8' }}>
                Delivering to
              </p>
              <p className="text-sm font-bold" style={{ color: '#1B2D5B' }}>
                Room {stay.room_number} · {stay.room_type}
              </p>
            </div>
          </div>
        ) : (
          <div
            className="rounded-2xl px-5 py-3 text-sm"
            style={{ background: 'rgba(239,68,68,0.07)', color: '#991B1B' }}
          >
            No active stay found. Please contact reception.
          </div>
        )}

        {/* Cart items */}
        {items.map((item) => (
          <div
            key={item.menuItemId}
            className="overflow-hidden rounded-2xl bg-white px-5 py-4"
            style={{ boxShadow: '0 1px 8px rgba(27,45,91,0.06)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p
                  className="truncate font-heading text-sm font-semibold leading-snug"
                  style={{ color: '#1B2D5B' }}
                >
                  {item.name}
                </p>
                <p className="mt-0.5 text-sm font-bold" style={{ color: '#C9A84C' }}>
                  €{(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                  className="flex size-8 items-center justify-center rounded-xl border transition-all active:scale-95"
                  style={{ borderColor: 'rgba(27,45,91,0.15)', color: '#1B2D5B' }}
                >
                  <Minus className="size-3" />
                </button>
                <span
                  className="w-5 text-center text-sm font-bold tabular-nums"
                  style={{ color: '#1B2D5B' }}
                >
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                  className="flex size-8 items-center justify-center rounded-xl transition-all active:scale-95"
                  style={{ background: '#1B2D5B', color: '#F8F0E8' }}
                >
                  <Plus className="size-3" />
                </button>
                <button
                  onClick={() => removeItem(item.menuItemId)}
                  className="ml-1 flex size-8 items-center justify-center rounded-xl transition-all active:scale-95"
                  style={{ color: '#EF4444', background: 'rgba(239,68,68,0.08)' }}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Notes */}
        <div
          className="rounded-2xl bg-white px-5 py-4"
          style={{ boxShadow: '0 1px 8px rgba(27,45,91,0.06)' }}
        >
          <label
            className="mb-2 block text-xs font-semibold uppercase tracking-widest"
            style={{ color: '#7A8BA8' }}
          >
            Special Requests
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Dietary requirements, allergies, or special requests…"
            rows={3}
            className="w-full resize-none rounded-xl border bg-transparent px-3 py-2.5 text-sm outline-none transition-all placeholder:text-[#B0BEC5] focus:ring-2"
            style={{
              borderColor: 'rgba(27,45,91,0.12)',
              color: '#1B2D5B',
            }}
          />
        </div>

        {/* Order summary */}
        <div
          className="rounded-2xl bg-white px-5 py-5"
          style={{ boxShadow: '0 1px 8px rgba(27,45,91,0.06)' }}
        >
          <div
            className="flex justify-between text-sm"
            style={{ color: '#7A8BA8' }}
          >
            <span>Subtotal</span>
            <span>€{total().toFixed(2)}</span>
          </div>
          <div
            className="my-3 h-px"
            style={{ background: 'rgba(27,45,91,0.07)' }}
          />
          <div className="flex justify-between">
            <span
              className="font-heading text-base font-semibold"
              style={{ color: '#1B2D5B' }}
            >
              Total
            </span>
            <span
              className="font-heading text-xl font-bold"
              style={{ color: '#C9A84C' }}
            >
              €{total().toFixed(2)}
            </span>
          </div>
          <p className="mt-1 text-xs" style={{ color: '#B0BEC5' }}>
            Charged to your room upon check-out
          </p>
        </div>

        {error && (
          <div
            className="rounded-2xl px-5 py-4 text-sm"
            style={{ background: 'rgba(239,68,68,0.08)', color: '#991B1B' }}
          >
            {error}
          </div>
        )}

        {/* Place order */}
        <button
          onClick={handlePlaceOrder}
          disabled={loading || stayLoading || !stay}
          className="w-full rounded-2xl py-4 text-base font-bold transition-all duration-150 active:scale-[0.98] disabled:opacity-60"
          style={{ background: '#1B2D5B', color: '#F8F0E8' }}
        >
          {loading ? 'Placing Order…' : 'Place Order →'}
        </button>

        <p className="text-center text-xs" style={{ color: '#B0BEC5' }}>
          Orders are typically delivered within 20–30 minutes
        </p>
      </div>
    </div>
  )
}
