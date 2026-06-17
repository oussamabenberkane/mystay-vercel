import { getTranslations } from 'next-intl/server'
import { BrandCrest } from '@/components/shared/brand-mark'
import { getDirectoryHotelsAction } from '@/lib/actions/hotels'
import { PublicHeader } from './_components/public-header'
import { HotelsBrowser } from './_components/hotels-browser'

/**
 * Public, anon-readable hotel directory (server component).
 *
 * Server-fetches every active directory hotel (anon RLS) and hands the list to
 * a client browser that does in-memory search / filter / sort. A navy hero with
 * a floating glass filter card that overlaps its lower edge anchors the page.
 * Mobile-first; RTL-aware (Arabic).
 */
export default async function HotelsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('hotels')
  const tl = await getTranslations('landing')
  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  const { data: hotels } = await getDirectoryHotelsAction()

  return (
    <div dir={dir} className="min-h-screen" style={{ background: '#F8F0E8' }}>
      <PublicHeader locale={locale} />

      {/* ── Hero band ── */}
      <section
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(155deg, #24386B 0%, #1B2D5B 52%, #14223F 100%)' }}
      >
        {/* decorative gold glow */}
        <div
          className="pointer-events-none absolute -end-16 -top-20 size-72 rounded-full opacity-[0.12]"
          style={{ background: 'radial-gradient(circle, #C9A84C 0%, transparent 70%)' }}
        />
        <div
          className="pointer-events-none absolute -start-24 bottom-0 size-80 rounded-full opacity-[0.08]"
          style={{ background: 'radial-gradient(circle, #E8D5A3 0%, transparent 70%)' }}
        />

        <div className="relative mx-auto max-w-6xl px-4 pt-12 pb-28 text-center sm:pt-16 sm:pb-36">
          <p className="text-[11px] font-bold uppercase tracking-[0.34em]" style={{ color: '#C9A84C' }}>
            {t('hero.kicker')}
          </p>
          <h1
            className="mx-auto mt-3 max-w-3xl font-heading text-3xl font-bold leading-[1.1] sm:text-5xl"
            style={{ color: '#F8F0E8' }}
          >
            {t('hero.title')}
          </h1>
          <p
            className="mx-auto mt-4 max-w-xl text-sm leading-relaxed sm:text-base"
            style={{ color: 'rgba(248,240,232,0.72)' }}
          >
            {t('hero.subtitle')}
          </p>
        </div>
      </section>

      {/* ── Browser (filter card overlaps the hero) ── */}
      <main className="relative z-10 mx-auto -mt-20 max-w-6xl px-4 pb-16 sm:-mt-28">
        <HotelsBrowser hotels={hotels} locale={locale} />
      </main>

      {/* ── Footer ── */}
      <footer className="border-t" style={{ borderColor: 'rgba(27,45,91,0.08)' }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-8 text-center">
          <BrandCrest size={32} spin={false} />
          <p className="font-heading text-base font-bold" style={{ color: '#1B2D5B' }}>
            My Stay
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em]" style={{ color: 'rgba(27,45,91,0.4)' }}>
            {tl('footer.tagline')}
          </p>
        </div>
      </footer>
    </div>
  )
}
