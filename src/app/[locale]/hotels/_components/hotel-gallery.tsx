'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

/**
 * Detail-page photo gallery: one large hero image with a thumbnail strip that
 * swaps the active photo. Falls back gracefully to a single image (no strip)
 * or a monogram tile when no photos exist. RTL-safe (logical scroll/spacing).
 */
export function HotelGallery({ images, name }: { images: string[]; name: string }) {
  const t = useTranslations('hotels')
  const [active, setActive] = useState(0)
  const safe = images.filter(Boolean)

  if (safe.length === 0) {
    return (
      <div
        className="flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded-3xl"
        style={{ background: '#14223F' }}
      >
        <span className="font-heading text-6xl font-bold" style={{ color: 'rgba(201,168,76,0.45)' }}>
          {name.charAt(0)}
        </span>
      </div>
    )
  }

  const current = safe[Math.min(active, safe.length - 1)]

  return (
    <div>
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-3xl" style={{ background: '#14223F' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={current}
          src={current}
          alt={t('detail.photoAlt', { name, n: active + 1 })}
          className="h-full w-full object-cover"
          style={{ animation: 'hotel-rise 0.4s cubic-bezier(0.16,1,0.3,1) both' }}
        />
      </div>

      {safe.length > 1 && (
        <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
          {safe.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              data-active={i === active}
              aria-label={t('detail.photoAlt', { name, n: i + 1 })}
              aria-current={i === active}
              className="gallery-thumb relative aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-xl sm:w-28"
              style={{
                background: '#14223F',
                outline: i === active ? '2px solid #C9A84C' : '2px solid transparent',
                outlineOffset: 2,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
