'use client'

import { useState, useRef, useEffect } from 'react'
import { UtensilsCrossed } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { MenuItemCard } from '@/components/guest/menu-item-card'
import { CartButton } from '@/components/guest/cart-button'
import { useAuthStore } from '@/lib/store/auth-store'
import { createClient } from '@/lib/supabase/client'

type MenuItem = {
  id: string
  name: string
  description: string | null
  price: number
  imageUrl: string | null
  categoryId: string
}

type Category = {
  id: string
  name: string
}

function CategoryTabSkeleton() {
  return (
    <div
      className="h-9 w-24 shrink-0 animate-pulse rounded-full"
      style={{ background: '#EEE4D8' }}
    />
  )
}

function MenuItemSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-2xl bg-white"
      style={{ boxShadow: '0 2px 12px rgba(27,45,91,0.07)' }}
    >
      <div className="h-44 w-full animate-pulse" style={{ background: '#EEE4D8' }} />
      <div className="space-y-2 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded-lg" style={{ background: '#EEE4D8' }} />
        <div className="h-3 w-full animate-pulse rounded-lg" style={{ background: '#EEE4D8' }} />
        <div className="h-3 w-2/3 animate-pulse rounded-lg" style={{ background: '#EEE4D8' }} />
        <div className="mt-3 flex items-center justify-between">
          <div className="h-5 w-14 animate-pulse rounded-lg" style={{ background: '#EEE4D8' }} />
          <div className="h-9 w-20 animate-pulse rounded-xl" style={{ background: '#EEE4D8' }} />
        </div>
      </div>
    </div>
  )
}

export default function MenuPage() {
  const { profile } = useAuthStore()
  const t = useTranslations('guest.menu')
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  useEffect(() => {
    if (!profile?.hotel_id) return

    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    async function fetchMenu() {
      const [{ data: cats }, { data: menuItems }] = await Promise.all([
        db
          .from('menu_categories')
          .select('id, name, sort_order')
          .eq('hotel_id', profile!.hotel_id)
          .order('sort_order', { ascending: true }),
        db
          .from('menu_items')
          .select('id, name, description, price, image_url, category_id, sort_order')
          .eq('hotel_id', profile!.hotel_id)
          .eq('is_available', true)
          .order('sort_order', { ascending: true }),
      ])

      const fetchedCats: Category[] = (cats ?? []).map(
        (c: { id: string; name: string }) => ({ id: c.id, name: c.name })
      )
      const fetchedItems: MenuItem[] = (menuItems ?? []).map(
        (i: {
          id: string
          name: string
          description: string | null
          price: number
          image_url: string | null
          category_id: string
        }) => ({
          id: i.id,
          name: i.name,
          description: i.description,
          price: i.price,
          imageUrl: i.image_url,
          categoryId: i.category_id,
        })
      )

      setCategories(fetchedCats)
      setItems(fetchedItems)
      if (fetchedCats.length > 0) setActiveCategory(fetchedCats[0].id)
      setLoading(false)
    }

    fetchMenu()
  }, [profile?.hotel_id])

  const itemsByCategory = categories.map((cat) => ({
    category: cat,
    items: items.filter((item) => item.categoryId === cat.id),
  }))

  function scrollToCategory(categoryId: string) {
    setActiveCategory(categoryId)
    const el = sectionRefs.current[categoryId]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-screen" style={{ background: '#F8F0E8' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-30 border-b px-4 py-4"
        style={{
          background: '#F8F0E8',
          borderColor: 'rgba(27,45,91,0.08)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: '#C9A84C' }}
            >
              {/* TODO: i18n */}
              Room Service
            </p>
            <h1
              className="font-heading text-2xl font-bold leading-tight"
              style={{ color: '#1B2D5B' }}
            >
              {t('title')}
            </h1>
          </div>
          <div
            className="flex size-10 items-center justify-center rounded-xl"
            style={{ background: 'rgba(27,45,91,0.06)' }}
          >
            <UtensilsCrossed className="size-5" style={{ color: '#1B2D5B' }} />
          </div>
        </div>

        {/* Category tabs */}
        <div className="mt-3 -mx-4 overflow-x-auto px-4 scrollbar-none">
          <div className="flex gap-2 pb-1">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <CategoryTabSkeleton key={i} />)
            ) : (
              categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => scrollToCategory(cat.id)}
                  className="shrink-0 cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition-all duration-150 hover:opacity-90"
                  style={
                    activeCategory === cat.id
                      ? { background: '#C9A84C', color: '#FFFFFF' }
                      : { background: 'rgba(27,45,91,0.07)', color: '#1B2D5B' }
                  }
                >
                  {cat.name}
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-8 px-4 py-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <MenuItemSkeleton key={i} />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div
              className="mb-5 flex size-20 items-center justify-center rounded-3xl"
              style={{ background: 'rgba(27,45,91,0.06)' }}
            >
              <UtensilsCrossed className="size-9" style={{ color: '#B0BEC5' }} />
            </div>
            <h2
              className="font-heading text-xl font-semibold"
              style={{ color: '#1B2D5B' }}
            >
              Menu coming soon
            </h2>
            <p className="mt-2 text-center text-sm" style={{ color: '#7A8BA8' }}>
              Our culinary team is preparing something exceptional for you.
            </p>
          </div>
        ) : (
          itemsByCategory.map(({ category, items: catItems }) => (
            <section
              key={category.id}
              ref={(el) => {
                sectionRefs.current[category.id] = el
              }}
              className="scroll-mt-36"
            >
              <div className="mb-4 flex items-center gap-3">
                <h2
                  className="font-heading text-xl font-semibold"
                  style={{ color: '#1B2D5B' }}
                >
                  {category.name}
                </h2>
                <div
                  className="h-px flex-1"
                  style={{ background: 'rgba(27,45,91,0.1)' }}
                />
              </div>
              {catItems.length === 0 ? (
                <p className="text-sm italic" style={{ color: '#B0BEC5' }}>
                  No items available in this category.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {catItems.map((item) => (
                    <MenuItemCard
                      key={item.id}
                      id={item.id}
                      name={item.name}
                      description={item.description}
                      price={item.price}
                      imageUrl={item.imageUrl}
                    />
                  ))}
                </div>
              )}
            </section>
          ))
        )}

        <div className="h-4" />
      </div>

      <CartButton />
    </div>
  )
}
