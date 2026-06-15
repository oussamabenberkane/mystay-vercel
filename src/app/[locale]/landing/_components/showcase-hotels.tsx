'use client'

import Link from 'next/link'
import type { ShowcaseHotel } from '@/lib/actions/landing'
import { formatCurrency } from '@/lib/utils/format'

type Labels = {
  heading: string
  kicker: string
  from: string
  perNight: string
  viewCta: string
}

/**
 * Partner-hotel showcase grid (pure marketing — NOT tenant data). Each card is
 * a link into the EXISTING signup flow (signup-with-hotel-code), per the locked
 * decision that showcase cards do not book directly. Cards render image, name,
 * location, indicative price, and rating, ordered by sort_order (server).
 */
export function ShowcaseHotels({
  hotels,
  locale,
  labels,
}: {
  hotels: ShowcaseHotel[]
  locale: string
  labels: Labels
}) {
  if (hotels.length === 0) return null

  return (
    <section>
      <div className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: '#C9A84C' }}>
          {labels.kicker}
        </p>
        <div className="mt-1 flex items-center gap-3">
          <h2 className="font-heading text-2xl font-bold" style={{ color: '#1B2D5B' }}>
            {labels.heading}
          </h2>
          <span
            className="h-px flex-1"
            style={{ background: 'linear-gradient(to right, rgba(201,168,76,0.4), transparent)' }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {hotels.map((hotel) => (
          <Link
            key={hotel.id}
            href={`/${locale}/signup`}
            className="showcase-card card-warm group flex flex-col overflow-hidden"
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
              {hotel.rating != null && (
                <div
                  className="absolute end-3 top-3 flex items-center gap-1 rounded-full px-2.5 py-1 shadow-md"
                  style={{ background: 'rgba(20,34,63,0.78)', backdropFilter: 'blur(4px)', border: '1px solid rgba(201,168,76,0.4)' }}
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
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="shrink-0">
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
                      {labels.from}
                    </p>
                    <p className="font-heading text-lg font-bold leading-tight" style={{ color: '#1B2D5B' }}>
                      {formatCurrency(Number(hotel.indicative_price))}
                      <span className="text-[11px] font-medium" style={{ color: '#7A8BA8' }}>
                        {' '}/ {labels.perNight}
                      </span>
                    </p>
                  </div>
                ) : (
                  <span />
                )}
                <span
                  className="showcase-cta flex items-center gap-1 text-xs font-bold uppercase tracking-wide"
                  style={{ color: '#C9A84C' }}
                >
                  {labels.viewCta}
                  <span className="showcase-arrow transition-transform" aria-hidden="true">
                    →
                  </span>
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <style>{`
        .showcase-card { transition: transform 0.25s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s; }
        .showcase-card:hover { transform: translateY(-4px); box-shadow: 0 18px 40px rgba(27,45,91,0.16); }
        .showcase-card:hover .showcase-arrow { transform: translateX(3px); }
        [dir='rtl'] .showcase-arrow { display: inline-block; transform: scaleX(-1); }
        [dir='rtl'] .showcase-card:hover .showcase-arrow { transform: scaleX(-1) translateX(3px); }
      `}</style>
    </section>
  )
}
