'use client'

import { useParams, usePathname, useRouter } from 'next/navigation'
import { locales } from '@/lib/i18n/config'

/**
 * Locale pills for the auth pages. Swaps the locale segment of the CURRENT path
 * (so switching language on /signup keeps you on /signup, not /login) and keeps
 * every locale — including Arabic — fully enabled.
 */
export function AuthLocaleSwitch() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const current = typeof params.locale === 'string' ? params.locale : 'en'

  function switchTo(locale: string) {
    const segments = pathname.split('/')
    segments[1] = locale
    router.push(segments.join('/'))
  }

  return (
    <div className="absolute top-5 right-5 flex items-center gap-1 z-20">
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => switchTo(l)}
          className={`relative px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.15em] transition-all duration-200 ${
            l === current
              ? 'bg-[#1B2D5B] text-[#C9A84C] shadow-sm'
              : 'text-[rgba(27,45,91,0.45)] hover:text-[#1B2D5B] cursor-pointer'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  )
}
