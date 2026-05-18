'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { locales, type Locale } from '@/lib/i18n/config'

const LABELS: Record<Locale, string> = {
  fr: 'FR',
  en: 'EN',
  ar: 'ع',
}

const FULL: Record<Locale, string> = {
  fr: 'Français',
  en: 'English',
  ar: 'العربية',
}

export function LanguageSelector() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const current = (typeof params.locale === 'string' ? params.locale : 'en') as Locale

  function switchTo(locale: Locale) {
    const segments = pathname.split('/')
    segments[1] = locale
    router.push(segments.join('/'))
  }

  return (
    <div className="flex items-center gap-1">
      {locales.map((locale) => (
        <button
          key={locale}
          onClick={() => switchTo(locale)}
          title={FULL[locale]}
          className="flex items-center justify-center rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all"
          style={{
            width: 30,
            height: 26,
            background: current === locale ? 'rgba(201,168,76,0.15)' : 'transparent',
            color: current === locale ? '#C9A84C' : '#7A8BA8',
            border: `1px solid ${current === locale ? 'rgba(201,168,76,0.4)' : 'transparent'}`,
          }}
        >
          {LABELS[locale]}
        </button>
      ))}
    </div>
  )
}
