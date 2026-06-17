import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import type { Locale } from '@/lib/i18n/config'
import { BrandCrest } from '@/components/shared/brand-mark'
import { getLandingContentAction } from '@/lib/actions/landing'
import { BannerCarousel } from './_components/banner-carousel'
import { FlashSales } from './_components/flash-sales'
import { ShowcaseHotels } from './_components/showcase-hotels'
import { LandingLangSwitch } from './_components/landing-lang-switch'

/**
 * Public, pre-auth marketing landing page (server component).
 *
 * Reads anon-readable CMS (ad_banners, flash_sales, showcase_hotels) and
 * composes: header (brand + locale switch + login/signup), an ad-banner
 * carousel, the "Ventes Flash" countdown section, the partner-hotel showcase,
 * and a closing CTA into the existing (auth) flow. Mobile-first; RTL-aware.
 */
export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('landing')
  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  const { banners, flashSales, hotels } = await getLandingContentAction()

  return (
    <div className="min-h-screen" style={{ background: '#F8F0E8' }}>
      {/* ── Sticky navy header ── */}
      <header
        className="sticky top-0 z-40"
        style={{
          background: 'rgba(27,45,91,0.96)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(201,168,76,0.18)',
        }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href={`/${locale}`} className="flex items-center gap-2.5">
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
              className="landing-cta rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wide"
              style={{ background: '#C9A84C', color: '#1B2D5B' }}
            >
              {t('nav.signup')}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-12 px-4 py-8 sm:py-10">
        {/* ── Hero ── */}
        <section className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.32em]" style={{ color: '#C9A84C' }}>
            {t('hero.kicker')}
          </p>
          <h1
            className="mx-auto mt-3 max-w-2xl font-heading text-3xl font-bold leading-tight sm:text-4xl"
            style={{ color: '#1B2D5B' }}
          >
            {t('hero.title')}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed sm:text-base" style={{ color: '#7A8BA8' }}>
            {t('hero.subtitle')}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={`/${locale}/signup`}
              className="landing-cta rounded-xl px-6 py-3 text-sm font-bold tracking-wide"
              style={{ background: '#1B2D5B', color: '#F8F0E8' }}
            >
              {t('hero.primaryCta')}
            </Link>
            <Link
              href={`/${locale}/login`}
              className="rounded-xl px-6 py-3 text-sm font-bold tracking-wide transition-colors"
              style={{ color: '#1B2D5B', border: '1.5px solid rgba(27,45,91,0.18)' }}
            >
              {t('hero.secondaryCta')}
            </Link>
          </div>
        </section>

        {/* ── Ad-banner carousel ── */}
        {banners.length > 0 && <BannerCarousel banners={banners} dir={dir} />}

        {/* ── Flash sales ── */}
        <FlashSales
          sales={flashSales}
          labels={{
            heading: t('flash.heading'),
            kicker: t('flash.kicker'),
            days: t('flash.days'),
            hours: t('flash.hours'),
            minutes: t('flash.minutes'),
            seconds: t('flash.seconds'),
            endsIn: t('flash.endsIn'),
            endingSoon: t('flash.endingSoon'),
          }}
        />

        {/* ── Partner hotels ── */}
        <ShowcaseHotels
          hotels={hotels}
          locale={locale}
          labels={{
            heading: t('hotels.heading'),
            kicker: t('hotels.kicker'),
            from: t('hotels.from'),
            perNight: t('hotels.perNight'),
            viewCta: t('hotels.viewCta'),
            viewAll: t('hotels.viewAll'),
          }}
        />

        {/* ── Closing CTA ── */}
        <section
          className="relative overflow-hidden rounded-3xl px-6 py-10 text-center sm:px-10 sm:py-12"
          style={{ background: 'radial-gradient(ellipse 90% 120% at 50% 0%, #24386B 0%, #1B2D5B 60%, #14223F 100%)' }}
        >
          <div
            className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full opacity-10"
            style={{ background: '#C9A84C' }}
          />
          <div className="relative">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: '#C9A84C' }}>
              {t('cta.kicker')}
            </p>
            <h2 className="mx-auto mt-2 max-w-lg font-heading text-2xl font-bold sm:text-3xl" style={{ color: '#F8F0E8' }}>
              {t('cta.title')}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: 'rgba(248,240,232,0.7)' }}>
              {t('cta.subtitle')}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={`/${locale}/signup`}
                className="landing-cta rounded-xl px-6 py-3 text-sm font-bold tracking-wide"
                style={{ background: '#C9A84C', color: '#1B2D5B' }}
              >
                {t('cta.signup')}
              </Link>
              <Link
                href={`/${locale}/login`}
                className="rounded-xl px-6 py-3 text-sm font-bold tracking-wide transition-colors"
                style={{ color: '#F8F0E8', border: '1px solid rgba(248,240,232,0.3)' }}
              >
                {t('cta.login')}
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t" style={{ borderColor: 'rgba(27,45,91,0.08)' }}>
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-4 py-8 text-center">
          <BrandCrest size={32} spin={false} />
          <p className="font-heading text-base font-bold" style={{ color: '#1B2D5B' }}>
            My Stay
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em]" style={{ color: 'rgba(27,45,91,0.4)' }}>
            {t('footer.tagline')}
          </p>
        </div>
      </footer>

      <style>{`
        .landing-cta { transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s; }
        .landing-cta:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(27,45,91,0.22); }
        .landing-cta:active { transform: translateY(0); }
      `}</style>
    </div>
  )
}
