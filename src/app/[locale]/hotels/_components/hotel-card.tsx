'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import type { DirectoryHotel } from '@/lib/actions/hotels'
import { formatCurrency } from '@/lib/utils/format'

/**
 * A single hotel result card linking to the detail page. Visual sibling of the
 * landing showcase card (image, rating badge, name, city, indicative price) but
 * routed to /hotels/[slug]. Reveal + hover behaviour come from the parent's
 * <style> block (.hotel-card / .hotel-reveal).
 */
export function HotelCard({
  hotel,
  locale,
  index,
}: {
  hotel: DirectoryHotel
  locale: string
  index: number
}) {
  const t = useTranslations('hotels')
  const href = hotel.slug ? `/${locale}/hotels/${hotel.slug}` : `/${locale}/hotels`

  return (
    <Link
      href={href}
      className="hotel-card hotel-reveal card-warm group flex flex-col overflow-hidden"
      style={{ animationDelay: `${Math.min(index, 11) * 55}ms` }}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden" style={{ background: '#14223F' }}>
        {hotel.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hotel.image_url}
            alt={hotel.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="font-heading text-3xl font-bold" style={{ color: 'rgba(201,168,76,0.5)' }}>
              {hotel.name.charAt(0)}
            </span>
          </div>
        )}
        {/* gradient scrim so the badge reads on any photo */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-20"
          style={{ background: 'linear-gradient(to bottom, rgba(20,34,63,0.45), transparent)' }}
        />
        {hotel.rating != null && (
          <div
            className="absolute end-3 top-3 flex items-center gap-1 rounded-full px-2.5 py-1 shadow-md"
            style={{
              background: 'rgba(20,34,63,0.78)',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(201,168,76,0.4)',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="#C9A84C" aria-hidden="true">
              <path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 17.3 5.8 20.9l1.6-6.8L2.2 8.9l6.9-.6z" />
            </svg>
            <span className="text-xs font-bold tabular-nums" style={{ color: '#F8F0E8' }}>
              {Number(hotel.rating).toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-heading text-lg font-bold leading-snug" style={{ color: '#1B2D5B' }}>
          {hotel.name}
        </h3>
        {hotel.location && (
          <p className="mt-1 flex items-center gap-1.5 text-sm" style={{ color: '#7A8BA8' }}>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
              className="shrink-0"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {hotel.location}
          </p>
        )}

        <div className="mt-auto flex items-end justify-between pt-4">
          {hotel.indicative_price != null ? (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: '#7A8BA8' }}>
                {t('card.from')}
              </p>
              <p className="font-heading text-lg font-bold leading-tight" style={{ color: '#1B2D5B' }}>
                {formatCurrency(Number(hotel.indicative_price))}
                <span className="text-[11px] font-medium" style={{ color: '#7A8BA8' }}>
                  {' '}/ {t('card.perNight')}
                </span>
              </p>
            </div>
          ) : (
            <span />
          )}
          <span
            className="hotel-cta flex items-center gap-1 text-xs font-bold uppercase tracking-wide"
            style={{ color: '#C9A84C' }}
          >
            {t('card.viewCta')}
            <span className="hotel-arrow transition-transform" aria-hidden="true">
              →
            </span>
          </span>
        </div>
      </div>
    </Link>
  )
}
