'use client'

import { useEffect, useState } from 'react'
import type { FlashSale } from '@/lib/actions/landing'

type Labels = {
  heading: string
  kicker: string
  days: string
  hours: string
  minutes: string
  seconds: string
  endsIn: string
  endingSoon: string
}

/** Remaining time broken into d/h/m/s, or null if already elapsed. */
function getRemaining(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now()
  if (diff <= 0) return null
  const totalSeconds = Math.floor(diff / 1000)
  return {
    diff,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  }
}

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

function Countdown({ endsAt, labels }: { endsAt: string; labels: Labels }) {
  // Compute only after mount to avoid SSR/client hydration mismatch (the
  // server has a different "now" than the client).
  const [remaining, setRemaining] = useState<ReturnType<typeof getRemaining> | undefined>(undefined)

  useEffect(() => {
    setRemaining(getRemaining(endsAt))
    const id = setInterval(() => setRemaining(getRemaining(endsAt)), 1000)
    return () => clearInterval(id)
  }, [endsAt])

  // First server/client paint: render a neutral placeholder.
  if (remaining === undefined) {
    return <div className="h-[52px]" aria-hidden="true" />
  }
  // Expired between fetch and tick — the parent also filters, but be safe.
  if (remaining === null) return null

  const urgent = remaining.diff < 60 * 60 * 1000 // < 1h
  const units: Array<{ value: number; label: string }> = [
    { value: remaining.days, label: labels.days },
    { value: remaining.hours, label: labels.hours },
    { value: remaining.minutes, label: labels.minutes },
    { value: remaining.seconds, label: labels.seconds },
  ].filter((u, i) => !(i === 0 && remaining.days === 0)) // drop "days" when zero

  return (
    <div>
      <p
        className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.22em]"
        style={{ color: urgent ? '#C0392B' : '#C9A84C' }}
      >
        {urgent ? labels.endingSoon : labels.endsIn}
      </p>
      <div className="flex items-center gap-1.5" dir="ltr">
        {units.map((u, i) => (
          <div key={u.label} className="flex items-center gap-1.5">
            <div
              className="flex min-w-[34px] flex-col items-center rounded-lg px-1.5 py-1"
              style={{
                background: urgent ? 'rgba(192,57,43,0.10)' : 'rgba(27,45,91,0.06)',
                border: `1px solid ${urgent ? 'rgba(192,57,43,0.25)' : 'rgba(27,45,91,0.08)'}`,
              }}
            >
              <span
                className="font-heading text-base font-bold leading-none tabular-nums"
                style={{ color: urgent ? '#C0392B' : '#1B2D5B' }}
              >
                {pad(u.value)}
              </span>
              <span className="mt-0.5 text-[7px] font-bold uppercase tracking-wider" style={{ color: '#7A8BA8' }}>
                {u.label}
              </span>
            </div>
            {i < units.length - 1 && (
              <span className="text-sm font-bold" style={{ color: 'rgba(27,45,91,0.25)' }}>
                :
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * "Ventes Flash" section. Renders active flash sales as cards, each with a LIVE
 * countdown to ends_at. Sales whose ends_at has already passed are hidden
 * (re-checked on every tick). Sales without ends_at are shown as ongoing
 * offers with no timer. The whole section hides itself when nothing is live.
 */
export function FlashSales({ sales, labels }: { sales: FlashSale[]; labels: Labels }) {
  const [, setTick] = useState(0)

  // Drive expiry re-evaluation once per second.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const visible = sales.filter((s) => {
    if (!s.ends_at) return true
    return new Date(s.ends_at).getTime() > Date.now()
  })

  if (visible.length === 0) return null

  return (
    <section>
      <SectionHeading kicker={labels.kicker} heading={labels.heading} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {visible.map((sale) => (
          <article
            key={sale.id}
            className="card-warm group relative flex flex-col overflow-hidden"
            style={{ border: '1px solid rgba(201,168,76,0.18)' }}
          >
            {sale.image_url && (
              <div className="relative aspect-[16/10] w-full overflow-hidden" style={{ background: '#14223F' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sale.image_url}
                  alt={sale.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {sale.discount_label && (
                  <span
                    className="absolute start-3 top-3 rounded-full px-3 py-1 text-xs font-black tracking-wide shadow-lg"
                    style={{ background: '#C9A84C', color: '#1B2D5B' }}
                  >
                    {sale.discount_label}
                  </span>
                )}
              </div>
            )}
            <div className="flex flex-1 flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-heading text-lg font-bold leading-snug" style={{ color: '#1B2D5B' }}>
                  {sale.title}
                </h3>
                {!sale.image_url && sale.discount_label && (
                  <span
                    className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-black"
                    style={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C' }}
                  >
                    {sale.discount_label}
                  </span>
                )}
              </div>
              {sale.description && (
                <p className="mt-1.5 text-sm leading-relaxed" style={{ color: '#7A8BA8' }}>
                  {sale.description}
                </p>
              )}
              <div className="mt-auto pt-4">
                {sale.ends_at && <Countdown endsAt={sale.ends_at} labels={labels} />}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function SectionHeading({ kicker, heading }: { kicker: string; heading: string }) {
  return (
    <div className="mb-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: '#C9A84C' }}>
        {kicker}
      </p>
      <div className="mt-1 flex items-center gap-3">
        <h2 className="font-heading text-2xl font-bold" style={{ color: '#1B2D5B' }}>
          {heading}
        </h2>
        <span className="h-px flex-1" style={{ background: 'linear-gradient(to right, rgba(201,168,76,0.4), transparent)' }} />
      </div>
    </div>
  )
}
