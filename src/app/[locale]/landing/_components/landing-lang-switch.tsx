'use client'

import { useRouter, usePathname } from 'next/navigation'
import { locales, type Locale } from '@/lib/i18n/config'

const LABELS: Record<Locale, string> = { en: 'EN', fr: 'FR', ar: 'ع' }

/**
 * Compact locale switcher for the landing header. Keeps the visitor on the
 * landing page (swaps only the locale segment of the current path).
 */
export function LandingLangSwitch({ current }: { current: Locale }) {
  const router = useRouter()
  const pathname = usePathname()

  function switchTo(locale: Locale) {
    const segments = pathname.split('/')
    segments[1] = locale
    router.push(segments.join('/') || `/${locale}`)
  }

  return (
    <div className="flex items-center gap-1">
      {locales.map((l) => {
        const active = l === current
        return (
          <button
            key={l}
            type="button"
            onClick={() => switchTo(l)}
            className="flex items-center justify-center rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all"
            style={{
              width: 30,
              height: 26,
              background: active ? 'rgba(201,168,76,0.18)' : 'transparent',
              color: active ? '#C9A84C' : 'rgba(248,240,232,0.65)',
              border: `1px solid ${active ? 'rgba(201,168,76,0.4)' : 'transparent'}`,
            }}
          >
            {LABELS[l]}
          </button>
        )
      })}
    </div>
  )
}
