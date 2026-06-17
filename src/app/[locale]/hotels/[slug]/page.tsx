import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import {
  ArrowLeft,
  BellRing,
  Briefcase,
  Car,
  Coffee,
  Compass,
  ConciergeBell,
  Dumbbell,
  Eye,
  Mail,
  MapPin,
  Martini,
  Mountain,
  Phone,
  Plane,
  Sparkles,
  Star,
  Trees,
  Umbrella,
  UtensilsCrossed,
  Users,
  Waves,
  Wifi,
  type LucideIcon,
} from 'lucide-react'
import { BrandCrest } from '@/components/shared/brand-mark'
import { getDirectoryHotelBySlugAction } from '@/lib/actions/hotels'
import { formatCurrency } from '@/lib/utils/format'
import { PublicHeader } from '../_components/public-header'
import { HotelGallery } from '../_components/hotel-gallery'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const { data } = await getDirectoryHotelBySlugAction(slug)
  if (!data) return { title: 'My Stay' }
  return {
    title: `${data.name} · My Stay`,
    description: data.description?.slice(0, 160) ?? undefined,
  }
}

/** Best-effort icon for a free-text amenity label. Unknowns fall back to a spark. */
function amenityIcon(label: string): LucideIcon {
  const s = label.toLowerCase()
  if (s.includes('wi-fi') || s.includes('wifi')) return Wifi
  if (s.includes('pool')) return Waves
  if (s.includes('spa') || s.includes('hammam')) return Sparkles
  if (s.includes('bar')) return Martini
  if (s.includes('restaurant') || s.includes('dining')) return UtensilsCrossed
  if (s.includes('shuttle') || s.includes('airport')) return Plane
  if (s.includes('concierge')) return ConciergeBell
  if (s.includes('garden') || s.includes('terrace')) return Trees
  if (s.includes('breakfast')) return Coffee
  if (s.includes('room service')) return BellRing
  if (s.includes('business')) return Briefcase
  if (s.includes('fitness') || s.includes('gym')) return Dumbbell
  if (s.includes('parking')) return Car
  if (s.includes('sea') || s.includes('view')) return Eye
  if (s.includes('beach')) return Umbrella
  if (s.includes('family')) return Users
  if (s.includes('desert') || s.includes('excursion')) return Mountain
  return Sparkles
}

export default async function HotelDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  const t = await getTranslations('hotels')
  const tl = await getTranslations('landing')
  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  const { data: hotel } = await getDirectoryHotelBySlugAction(slug)

  // ── Not-found state (on-brand, not the default 404) ──
  if (!hotel) {
    return (
      <div dir={dir} className="flex min-h-screen flex-col" style={{ background: '#F8F0E8' }}>
        <PublicHeader locale={locale} />
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 py-20 text-center">
          <div
            className="flex size-16 items-center justify-center rounded-2xl"
            style={{ background: 'rgba(201,168,76,0.14)' }}
          >
            <Compass className="size-8" style={{ color: '#C9A84C' }} aria-hidden="true" />
          </div>
          <h1 className="mt-5 font-heading text-2xl font-bold sm:text-3xl" style={{ color: '#1B2D5B' }}>
            {t('detail.notFoundTitle')}
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed" style={{ color: '#7A8BA8' }}>
            {t('detail.notFoundBody')}
          </p>
          <Link
            href={`/${locale}/hotels`}
            className="public-cta mt-6 rounded-xl px-6 py-3 text-sm font-bold tracking-wide"
            style={{ background: '#1B2D5B', color: '#F8F0E8' }}
          >
            {t('detail.notFoundCta')}
          </Link>
        </main>
      </div>
    )
  }

  const images = Array.from(new Set([hotel.image_url, ...hotel.gallery].filter((s): s is string => !!s)))
  const ratingRounded = hotel.rating != null ? Math.round(Number(hotel.rating)) : 0

  return (
    <div dir={dir} className="min-h-screen" style={{ background: '#F8F0E8' }}>
      <PublicHeader locale={locale} />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        {/* Breadcrumb */}
        <Link
          href={`/${locale}/hotels`}
          className="group inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide transition-colors"
          style={{ color: '#7A8BA8' }}
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5 rtl:rotate-180" aria-hidden="true" />
          {t('detail.back')}
        </Link>

        {/* Gallery */}
        <div className="mt-4">
          <HotelGallery images={images} name={hotel.name} />
        </div>

        {/* Title block */}
        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-heading text-3xl font-bold leading-tight sm:text-4xl" style={{ color: '#1B2D5B' }}>
              {hotel.name}
            </h1>
            {hotel.location && (
              <p className="mt-2 flex items-center gap-1.5 text-sm font-medium" style={{ color: '#7A8BA8' }}>
                <MapPin className="size-4 shrink-0" aria-hidden="true" />
                {hotel.location}
              </p>
            )}
          </div>
          {hotel.rating != null && (
            <div
              className="flex shrink-0 items-center gap-3 rounded-2xl px-4 py-2.5"
              style={{ background: '#FFFFFF', boxShadow: '0 2px 16px rgba(27,45,91,0.08)' }}
            >
              <span className="font-heading text-2xl font-bold tabular-nums" style={{ color: '#1B2D5B' }}>
                {Number(hotel.rating).toFixed(1)}
              </span>
              <div>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className="size-3"
                      style={{ color: '#C9A84C' }}
                      fill={i < ratingRounded ? '#C9A84C' : 'transparent'}
                      strokeWidth={i < ratingRounded ? 0 : 1.5}
                      aria-hidden="true"
                    />
                  ))}
                </div>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#7A8BA8' }}>
                  {t('detail.ratingLabel')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Content + aside */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.7fr_1fr]">
          {/* Main column */}
          <div className="space-y-10">
            {hotel.description && (
              <section>
                <h2 className="font-heading text-xl font-bold" style={{ color: '#1B2D5B' }}>
                  {t('detail.aboutHeading')}
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed" style={{ color: '#42506E' }}>
                  {hotel.description}
                </p>
              </section>
            )}

            {hotel.amenities.length > 0 && (
              <section>
                <h2 className="font-heading text-xl font-bold" style={{ color: '#1B2D5B' }}>
                  {t('detail.amenitiesHeading')}
                </h2>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {hotel.amenities.map((a) => {
                    const Icon = amenityIcon(a)
                    return (
                      <div
                        key={a}
                        className="flex items-center gap-3 rounded-xl px-3.5 py-3"
                        style={{ background: '#FFFFFF', boxShadow: '0 1px 8px rgba(27,45,91,0.06)' }}
                      >
                        <span
                          className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                          style={{ background: 'rgba(201,168,76,0.14)' }}
                        >
                          <Icon className="size-4" style={{ color: '#C9A84C' }} aria-hidden="true" />
                        </span>
                        <span className="text-sm font-semibold" style={{ color: '#1B2D5B' }}>
                          {a}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {(hotel.phone || hotel.email || hotel.address) && (
              <section>
                <h2 className="font-heading text-xl font-bold" style={{ color: '#1B2D5B' }}>
                  {t('detail.contactHeading')}
                </h2>
                <div className="mt-4 space-y-2.5">
                  {hotel.address && (
                    <ContactRow icon={MapPin} label={t('detail.address')} value={hotel.address} />
                  )}
                  {hotel.phone && (
                    <ContactRow icon={Phone} label={t('detail.phone')} value={hotel.phone} href={`tel:${hotel.phone.replace(/\s+/g, '')}`} />
                  )}
                  {hotel.email && (
                    <ContactRow icon={Mail} label={t('detail.email')} value={hotel.email} href={`mailto:${hotel.email}`} />
                  )}
                </div>
              </section>
            )}
          </div>

          {/* Aside — signup CTA */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div
              className="relative overflow-hidden rounded-3xl p-6"
              style={{ background: 'linear-gradient(160deg, #24386B 0%, #1B2D5B 55%, #14223F 100%)' }}
            >
              <div
                className="pointer-events-none absolute -end-8 -top-8 size-32 rounded-full opacity-10"
                style={{ background: '#C9A84C' }}
              />
              <div className="relative">
                {hotel.indicative_price != null && (
                  <div className="mb-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: '#C9A84C' }}>
                      {t('detail.from')}
                    </p>
                    <p className="font-heading text-3xl font-bold leading-tight" style={{ color: '#F8F0E8' }}>
                      {formatCurrency(Number(hotel.indicative_price))}
                      <span className="text-sm font-medium" style={{ color: 'rgba(248,240,232,0.6)' }}>
                        {' '}/ {t('detail.perNight')}
                      </span>
                    </p>
                  </div>
                )}

                <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: '#C9A84C' }}>
                  {t('detail.bookKicker')}
                </p>
                <h2 className="mt-1 font-heading text-xl font-bold" style={{ color: '#F8F0E8' }}>
                  {t('detail.bookTitle')}
                </h2>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'rgba(248,240,232,0.72)' }}>
                  {t('detail.bookBody')}
                </p>

                <Link
                  href={`/${locale}/signup`}
                  className="public-cta mt-5 flex w-full items-center justify-center rounded-xl px-5 py-3 text-sm font-bold tracking-wide"
                  style={{ background: '#C9A84C', color: '#1B2D5B' }}
                >
                  {t('detail.signupCta')}
                </Link>
                <Link
                  href={`/${locale}/login`}
                  className="mt-2.5 flex w-full items-center justify-center rounded-xl px-5 py-3 text-sm font-bold tracking-wide transition-colors"
                  style={{ color: '#F8F0E8', border: '1px solid rgba(248,240,232,0.3)' }}
                >
                  {t('detail.loginCta')}
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Footer */}
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

function ContactRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: LucideIcon
  label: string
  value: string
  href?: string
}) {
  const body = (
    <div
      className="flex items-center gap-3 rounded-xl px-3.5 py-3 transition-colors"
      style={{ background: '#FFFFFF', boxShadow: '0 1px 8px rgba(27,45,91,0.06)' }}
    >
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-lg"
        style={{ background: 'rgba(27,45,91,0.06)' }}
      >
        <Icon className="size-4" style={{ color: '#1B2D5B' }} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#7A8BA8' }}>
          {label}
        </p>
        <p className="truncate text-sm font-semibold" style={{ color: '#1B2D5B' }}>
          {value}
        </p>
      </div>
    </div>
  )
  return href ? (
    <a href={href} className="block">
      {body}
    </a>
  ) : (
    body
  )
}
