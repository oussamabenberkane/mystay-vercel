'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BrandCrest, BrandWordmark } from '@/components/shared/brand-mark'
import { SPLASH_DELAY_MS } from '@/lib/config/splash'

/**
 * Pre-auth splash. Centered "My Stay" crest + wordmark on the navy "vault"
 * background, displayed for SPLASH_DELAY_MS, then AUTO-redirects (no tap) to
 * the locale-prefixed landing page.
 *
 * Belt-and-braces redirect: a router.replace at the configured delay, plus a
 * <meta http-equiv="refresh"> fallback in the server page in case JS is slow /
 * disabled. A "Skip" affordance lets impatient users advance immediately.
 */
export function SplashClient({
  locale,
  kicker,
  skipLabel,
}: {
  locale: string
  kicker: string
  skipLabel: string
}) {
  const router = useRouter()
  const target = `/${locale}/landing`
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    router.prefetch(target)
  }, [router, target])

  useEffect(() => {
    // Start the gentle fade-out slightly before navigating for a smooth handoff.
    const fadeTimer = setTimeout(() => setLeaving(true), Math.max(0, SPLASH_DELAY_MS - 450))
    const navTimer = setTimeout(() => router.replace(target), SPLASH_DELAY_MS)
    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(navTimer)
    }
  }, [router, target])

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6"
      style={{
        background: 'radial-gradient(ellipse 90% 70% at 50% 30%, #24386B 0%, #1B2D5B 55%, #14223F 100%)',
        opacity: leaving ? 0 : 1,
        transition: 'opacity 0.45s cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      {/* Faint diamond lattice texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='52' height='52' viewBox='0 0 52 52' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M26 2L50 26L26 50L2 26Z' fill='none' stroke='rgba(201%2C168%2C76%2C0.06)' stroke-width='0.6'/%3E%3C/svg%3E\")",
        }}
      />
      {/* Warm radial glow from behind the crest */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: 460,
          height: 460,
          background: 'radial-gradient(circle, rgba(201,168,76,0.14) 0%, transparent 65%)',
        }}
      />

      {/* Corner L-brackets framing the screen */}
      {[
        'top-6 left-6 border-t border-l',
        'top-6 right-6 border-t border-r',
        'bottom-6 left-6 border-b border-l',
        'bottom-6 right-6 border-b border-r',
      ].map((cls, i) => (
        <div
          key={i}
          className={`absolute ${cls} h-7 w-7`}
          style={{ borderColor: 'rgba(201,168,76,0.25)', borderWidth: 1 }}
        />
      ))}

      <div className="splash-rise relative z-10 flex flex-col items-center">
        <BrandCrest size={132} />
        <div className="mt-7">
          <BrandWordmark kicker={kicker} size={34} />
        </div>
      </div>

      {/* Bottom loading shimmer bar */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10">
        <div
          className="relative h-px overflow-hidden rounded-full"
          style={{ width: 132, background: 'rgba(201,168,76,0.18)' }}
        >
          <span className="splash-track absolute inset-y-0 left-0 w-1/3 rounded-full" style={{ background: '#C9A84C' }} />
        </div>
      </div>

      <button
        type="button"
        onClick={() => router.replace(target)}
        aria-label={skipLabel}
        className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.3em] transition-opacity hover:opacity-100"
        style={{ color: 'rgba(248,240,232,0.45)' }}
      >
        <span>{skipLabel}</span>
        <span aria-hidden="true">→</span>
      </button>

      <style>{`
        @keyframes splashRise {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        .splash-rise { animation: splashRise 0.8s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes splashTrack {
          0%   { left: -35%; }
          100% { left: 100%; }
        }
        .splash-track { animation: splashTrack 1.4s cubic-bezier(0.4,0,0.2,1) infinite; }
        @keyframes brandCrestSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .brand-crest-spin { animation: brandCrestSpin 60s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .splash-rise, .splash-track, .brand-crest-spin { animation: none !important; }
        }
      `}</style>
    </div>
  )
}
