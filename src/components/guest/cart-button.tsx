'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ShoppingBag } from 'lucide-react'
import { useCartStore } from '@/lib/store/cart-store'
import { formatCurrency } from '@/lib/utils/format'

export function CartButton() {
  const { items, total, itemCount } = useCartStore()
  const params = useParams()
  const locale = typeof params.locale === 'string' ? params.locale : 'en'

  const count = itemCount()
  if (count === 0) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 flex justify-center">
      <Link
        href={`/${locale}/menu/cart`}
        className="flex w-full max-w-sm items-center justify-between rounded-2xl px-5 py-4 shadow-[0_4px_24px_rgba(27,45,91,0.22)] transition-transform duration-150 active:scale-[0.98]"
        style={{ background: '#1B2D5B' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex size-9 items-center justify-center rounded-xl"
            style={{ background: '#C9A84C' }}
          >
            <ShoppingBag className="size-4.5 text-white" />
          </div>
          <div>
            <p className="text-xs font-medium" style={{ color: 'rgba(248,240,232,0.65)' }}>
              {count} {count === 1 ? 'item' : 'items'} in cart
            </p>
            <p className="text-base font-bold" style={{ color: '#F8F0E8' }}>
              View Order
            </p>
          </div>
        </div>
        <span className="font-heading text-lg font-bold" style={{ color: '#C9A84C' }}>
          {formatCurrency(total())}
        </span>
      </Link>
    </div>
  )
}
