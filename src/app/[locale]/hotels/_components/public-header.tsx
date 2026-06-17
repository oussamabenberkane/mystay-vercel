import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import type { Locale } from '@/lib/i18n/config'
import { BrandCrest } from '@/components/shared/brand-mark'
import { LandingLangSwitch } from '../../landing/_components/landing-lang-switch'

/**
 * Sticky navy header shared by the public hotel directory (/hotels and
 * /hotels/[slug]). Mirrors the landing header so the discovery flow reads as
 * one continuous pre-auth site. Brand mark returns to the marketing landing.
 */
export async function PublicHeader({ locale }: { locale: string }) {
  const t = await getTranslations('hotels')

  return (
    <header
      className="sticky top-0 z-40"
      style={{
        background: 'rgba(27,45,91,0.96)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(201,168,76,0.18)',
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href={`/${locale}/landing`} className="flex items-center gap-2.5">
          <BrandCrest size={36} spin={false} />
          <span className="font-heading text-lg font-bold tracking-[0.04em]" style={{ color: '#F8F0E8' }}>
            My Stay
          </span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <LandingLangSwitch current={locale as Locale} />
          <Link
            href={`/${locale}/login`}
            className="hidden rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors sm:inline-block"
            style={{ color: '#F8F0E8', border: '1px solid rgba(248,240,232,0.25)' }}
          >
            {t('nav.login')}
          </Link>
          <Link
            href={`/${locale}/signup`}
            className="public-cta rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wide"
            style={{ background: '#C9A84C', color: '#1B2D5B' }}
          >
            {t('nav.signup')}
          </Link>
        </div>
      </div>
    </header>
  )
}
