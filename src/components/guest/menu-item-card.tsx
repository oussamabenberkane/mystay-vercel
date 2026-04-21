'use client'

import Image from 'next/image'
import { Plus, Minus } from 'lucide-react'
import { useCartStore } from '@/lib/store/cart-store'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils/format'

type Props = {
  id: string
  name: string
  description: string | null
  price: number
  imageUrl: string | null
}

export function MenuItemCard({ id, name, description, price, imageUrl }: Props) {
  const { items, addItem, updateQuantity } = useCartStore()
  const cartItem = items.find((i) => i.menuItemId === id)
  const quantity = cartItem?.quantity ?? 0

  const handleAdd = () => {
    addItem({ menuItemId: id, name, price, imageUrl })
  }

  const handleDecrement = () => {
    updateQuantity(id, quantity - 1)
  }

  return (
    <div
      className="overflow-hidden rounded-2xl bg-white transition-shadow duration-200 hover:shadow-[0_4px_24px_rgba(27,45,91,0.12)]"
      style={{ boxShadow: '0 2px 12px rgba(27,45,91,0.07)' }}
    >
      {/* Image / placeholder */}
      <div
        className="relative h-44 w-full overflow-hidden"
        style={{
          background: imageUrl
            ? undefined
            : 'linear-gradient(135deg, #F8F0E8 0%, #EEE4D8 40%, #E8D5A3 100%)',
        }}
      >
        {imageUrl ? (
          <Image src={imageUrl} alt={name} fill className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <div className="text-center opacity-40">
              <div className="text-4xl">🍽️</div>
            </div>
          </div>
        )}
        {/* Gold shimmer overlay on placeholder */}
        {!imageUrl && (
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(135deg, transparent 40%, rgba(201,168,76,0.08) 100%)',
            }}
          />
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3
          className="font-heading text-base font-semibold leading-snug"
          style={{ color: '#1B2D5B' }}
        >
          {name}
        </h3>
        {description && (
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed" style={{ color: '#7A8BA8' }}>
            {description}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between">
          <span className="font-heading text-lg font-bold" style={{ color: '#C9A84C' }}>
            {formatCurrency(price)}
          </span>

          {quantity === 0 ? (
            <button
              onClick={handleAdd}
              className="flex cursor-pointer items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-95"
              style={{ background: '#1B2D5B', color: '#F8F0E8' }}
            >
              <Plus className="size-3.5" />
              Add
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDecrement}
                className="flex size-9 cursor-pointer items-center justify-center rounded-xl border transition-all duration-150 hover:bg-[rgba(27,45,91,0.06)] active:scale-95"
                style={{ borderColor: 'rgba(27,45,91,0.15)', color: '#1B2D5B' }}
              >
                <Minus className="size-3.5" />
              </button>
              <span
                className="w-6 text-center text-sm font-bold tabular-nums"
                style={{ color: '#1B2D5B' }}
              >
                {quantity}
              </span>
              <button
                onClick={handleAdd}
                className="flex size-9 cursor-pointer items-center justify-center rounded-xl transition-all duration-150 hover:opacity-90 active:scale-95"
                style={{ background: '#1B2D5B', color: '#F8F0E8' }}
              >
                <Plus className="size-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
