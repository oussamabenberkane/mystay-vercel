'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { AdBanner } from '@/lib/actions/landing'

const AUTOPLAY_MS = 5000

/**
 * Ad-banner carousel. Auto-advances every AUTOPLAY_MS AND offers manual
 * controls (prev/next arrows + dot indicators). Autoplay pauses on hover and
 * resumes on leave. Banners with a link_url are clickable. RTL-aware via the
 * `dir` so the arrows read naturally in Arabic.
 */
export function BannerCarousel({ banners, dir }: { banners: AdBanner[]; dir: 'ltr' | 'rtl' }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const count = banners.length
  const touchStartX = useRef<number | null>(null)

  const go = useCallback(
    (next: number) => {
      if (count === 0) return
      setIndex(((next % count) + count) % count)
    },
    [count]
  )

  useEffect(() => {
    if (count <= 1 || paused) return
    const id = setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS)
    return () => clearInterval(id)
  }, [count, paused])

  if (count === 0) return null

  const prevArrow = dir === 'rtl' ? '→' : '←'
  const nextArrow = dir === 'rtl' ? '←' : '→'

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    const swipeNext = dir === 'rtl' ? delta > 40 : delta < -40
    const swipePrev = dir === 'rtl' ? delta < -40 : delta > 40
    if (swipeNext) go(index + 1)
    else if (swipePrev) go(index - 1)
    touchStartX.current = null
  }

  return (
    <div
      className="relative overflow-hidden rounded-3xl"
      style={{ boxShadow: '0 16px 48px rgba(27,45,91,0.16)' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Slides track */}
      <div
        className="flex transition-transform duration-700"
        style={{
          transform: `translateX(${dir === 'rtl' ? '' : '-'}${index * 100}%)`,
          transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {banners.map((b) => {
          const inner = (
            <div
              className="relative aspect-[16/9] w-full overflow-hidden sm:aspect-[21/9]"
              style={{ background: '#14223F' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={b.image_url}
                alt={b.title ?? ''}
                className="h-full w-full object-cover"
                loading="lazy"
              />
              {/* Navy gradient scrim for legibility */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{ background: 'linear-gradient(to top, rgba(20,34,63,0.78) 0%, rgba(20,34,63,0.12) 45%, transparent 70%)' }}
              />
              {b.title && (
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
                  <span className="mb-2 inline-block h-px w-8" style={{ background: '#C9A84C' }} />
                  <h3 className="font-heading text-lg font-bold text-[#F8F0E8] sm:text-2xl">
                    {b.title}
                  </h3>
                </div>
              )}
            </div>
          )
          return (
            <div key={b.id} className="w-full shrink-0">
              {b.link_url ? (
                <a href={b.link_url} target="_blank" rel="noopener noreferrer" className="block">
                  {inner}
                </a>
              ) : (
                inner
              )}
            </div>
          )
        })}
      </div>

      {count > 1 && (
        <>
          {/* Prev / Next */}
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous"
            className="carousel-arrow absolute top-1/2 -translate-y-1/2 start-3 flex h-9 w-9 items-center justify-center rounded-full text-[#F8F0E8]"
          >
            <span aria-hidden="true">{prevArrow}</span>
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next"
            className="carousel-arrow absolute top-1/2 -translate-y-1/2 end-3 flex h-9 w-9 items-center justify-center rounded-full text-[#F8F0E8]"
          >
            <span aria-hidden="true">{nextArrow}</span>
          </button>

          {/* Dots */}
          <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-2">
            {banners.map((b, i) => (
              <button
                key={b.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to slide ${i + 1}`}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === index ? 22 : 6,
                  background: i === index ? '#C9A84C' : 'rgba(248,240,232,0.55)',
                }}
              />
            ))}
          </div>
        </>
      )}

      <style>{`
        .carousel-arrow {
          background: rgba(20,34,63,0.55);
          border: 1px solid rgba(201,168,76,0.4);
          backdrop-filter: blur(4px);
          transition: background 0.2s, transform 0.2s;
        }
        .carousel-arrow:hover {
          background: rgba(27,45,91,0.85);
          transform: translateY(-50%) scale(1.08);
        }
      `}</style>
    </div>
  )
}
