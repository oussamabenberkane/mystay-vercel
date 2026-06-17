'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown, Compass, RotateCcw, Search } from 'lucide-react'
import type { DirectoryHotel } from '@/lib/actions/hotels'
import { formatCurrency } from '@/lib/utils/format'
import { HotelCard } from './hotel-card'

type Sort = 'featured' | 'priceAsc' | 'priceDesc' | 'rating'

/** A native <select> dressed to match the warm-luxury palette (RTL-aware chevron). */
function FilterSelect({
  value,
  onChange,
  ariaLabel,
  children,
}: {
  value: string
  onChange: (v: string) => void
  ariaLabel: string
  children: React.ReactNode
}) {
  return (
    <div className="relative">
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-xl bg-white py-2.5 ps-3.5 pe-9 text-sm font-semibold outline-none transition-shadow focus:ring-2"
        style={{ color: '#1B2D5B', border: '1.5px solid rgba(27,45,91,0.12)' }}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2"
        style={{ color: '#7A8BA8' }}
        aria-hidden="true"
      />
    </div>
  )
}

/**
 * Client-side search / filter / sort over the (small, global) hotel directory.
 * The list is server-rendered for SEO; all interaction is in-memory here, so
 * filtering is instant with no extra round-trips. RTL-aware via logical classes.
 */
export function HotelsBrowser({
  hotels,
  locale,
}: {
  hotels: DirectoryHotel[]
  locale: string
}) {
  const t = useTranslations('hotels')

  const cities = useMemo(
    () =>
      Array.from(new Set(hotels.map((h) => h.location).filter((l): l is string => !!l))).sort(
        (a, b) => a.localeCompare(b)
      ),
    [hotels]
  )

  const priced = useMemo(
    () => hotels.map((h) => (h.indicative_price != null ? Number(h.indicative_price) : null)).filter((p): p is number => p != null),
    [hotels]
  )
  const hasPrice = priced.length > 0
  const priceFloor = hasPrice ? Math.floor(Math.min(...priced) / 500) * 500 : 0
  const priceCeil = hasPrice ? Math.ceil(Math.max(...priced) / 500) * 500 : 0

  const [query, setQuery] = useState('')
  const [city, setCity] = useState('')
  const [minRating, setMinRating] = useState(0)
  const [maxPrice, setMaxPrice] = useState(priceCeil)
  const [sort, setSort] = useState<Sort>('featured')

  const isFiltered = query.trim() !== '' || city !== '' || minRating > 0 || (hasPrice && maxPrice < priceCeil)

  function reset() {
    setQuery('')
    setCity('')
    setMinRating(0)
    setMaxPrice(priceCeil)
    setSort('featured')
  }

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = hotels.filter((h) => {
      if (q) {
        const hay = `${h.name} ${h.location ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (city && h.location !== city) return false
      if (minRating > 0 && (h.rating == null || Number(h.rating) < minRating)) return false
      if (hasPrice && maxPrice < priceCeil) {
        if (h.indicative_price != null && Number(h.indicative_price) > maxPrice) return false
      }
      return true
    })

    const byNullable = (a: number | null, b: number | null, dir: number) => {
      if (a == null && b == null) return 0
      if (a == null) return 1
      if (b == null) return -1
      return (a - b) * dir
    }

    const sorted = [...filtered]
    if (sort === 'priceAsc')
      sorted.sort((a, b) => byNullable(a.indicative_price != null ? Number(a.indicative_price) : null, b.indicative_price != null ? Number(b.indicative_price) : null, 1))
    else if (sort === 'priceDesc')
      sorted.sort((a, b) => byNullable(a.indicative_price != null ? Number(a.indicative_price) : null, b.indicative_price != null ? Number(b.indicative_price) : null, -1))
    else if (sort === 'rating')
      sorted.sort((a, b) => byNullable(a.rating != null ? Number(a.rating) : null, b.rating != null ? Number(b.rating) : null, -1))
    else sorted.sort((a, b) => a.sort_order - b.sort_order)

    return sorted
  }, [hotels, query, city, minRating, maxPrice, priceCeil, hasPrice, sort])

  return (
    <div>
      {/* ── Floating filter card (overlaps the hero edge) ── */}
      <div className="card-warm relative z-10 p-4 sm:p-5" style={{ boxShadow: '0 20px 50px rgba(20,34,63,0.22)' }}>
        {/* Row 1 — search + sort */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2"
              style={{ color: '#7A8BA8' }}
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('search.placeholder')}
              aria-label={t('search.placeholder')}
              className="w-full rounded-xl bg-white py-2.5 ps-10 pe-3.5 text-sm font-medium outline-none transition-shadow focus:ring-2"
              style={{ color: '#1B2D5B', border: '1.5px solid rgba(27,45,91,0.12)' }}
            />
          </div>
          <div className="sm:w-52">
            <FilterSelect value={sort} onChange={(v) => setSort(v as Sort)} ariaLabel={t('filters.sort')}>
              <option value="featured">{t('filters.sortFeatured')}</option>
              <option value="rating">{t('filters.sortRating')}</option>
              <option value="priceAsc">{t('filters.sortPriceAsc')}</option>
              <option value="priceDesc">{t('filters.sortPriceDesc')}</option>
            </FilterSelect>
          </div>
        </div>

        {/* Row 2 — city + rating + (price slider) */}
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="sm:w-48">
            <FilterSelect value={city} onChange={setCity} ariaLabel={t('filters.city')}>
              <option value="">{t('filters.allCities')}</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </FilterSelect>
          </div>
          <div className="sm:w-44">
            <FilterSelect value={String(minRating)} onChange={(v) => setMinRating(Number(v))} ariaLabel={t('filters.rating')}>
              <option value="0">{t('filters.anyRating')}</option>
              <option value="4">{t('filters.ratingValue', { rating: '4.0' })}</option>
              <option value="4.5">{t('filters.ratingValue', { rating: '4.5' })}</option>
            </FilterSelect>
          </div>

          {hasPrice && (
            <div className="flex-1">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-semibold" style={{ color: '#7A8BA8' }}>
                  {t('filters.maxPrice')}
                </span>
                <span className="font-heading text-sm font-bold tabular-nums" style={{ color: '#1B2D5B' }}>
                  {maxPrice >= priceCeil ? t('filters.anyPrice') : formatCurrency(maxPrice)}
                </span>
              </div>
              <input
                type="range"
                min={priceFloor}
                max={priceCeil}
                step={500}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                aria-label={t('filters.maxPrice')}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full"
                style={{ accentColor: '#C9A84C', background: 'rgba(27,45,91,0.12)' }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Result meta ── */}
      <div className="mt-6 flex items-center justify-between gap-3 px-1">
        <p className="text-sm font-semibold" style={{ color: '#7A8BA8' }}>
          {t('filters.results', { count: results.length })}
        </p>
        {isFiltered && (
          <button
            type="button"
            onClick={reset}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors hover:bg-black/5"
            style={{ color: '#C9A84C' }}
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            {t('filters.clear')}
          </button>
        )}
      </div>

      {/* ── Results grid / empty state ── */}
      {results.length > 0 ? (
        <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((hotel, i) => (
            <HotelCard key={hotel.id} hotel={hotel} locale={locale} index={i} />
          ))}
        </div>
      ) : (
        <div
          className="mt-3 flex flex-col items-center justify-center rounded-3xl px-6 py-16 text-center"
          style={{ background: 'rgba(255,255,255,0.6)', border: '1px dashed rgba(27,45,91,0.15)' }}
        >
          <div
            className="flex size-14 items-center justify-center rounded-2xl"
            style={{ background: 'rgba(201,168,76,0.14)' }}
          >
            <Compass className="size-7" style={{ color: '#C9A84C' }} aria-hidden="true" />
          </div>
          <h3 className="mt-4 font-heading text-xl font-bold" style={{ color: '#1B2D5B' }}>
            {t('empty.title')}
          </h3>
          <p className="mt-1.5 max-w-sm text-sm leading-relaxed" style={{ color: '#7A8BA8' }}>
            {t('empty.body')}
          </p>
          {isFiltered && (
            <button
              type="button"
              onClick={reset}
              className="public-cta mt-5 rounded-xl px-5 py-2.5 text-sm font-bold tracking-wide"
              style={{ background: '#1B2D5B', color: '#F8F0E8' }}
            >
              {t('empty.reset')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
