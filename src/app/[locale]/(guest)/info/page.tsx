import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { defaultLocale } from '@/lib/i18n/config'
import { getTranslations } from 'next-intl/server'
import { getHotelInfoAction } from '@/lib/actions/hotel-info'
import {
  Phone,
  Mail,
  Clock,
  Wifi,
  UtensilsCrossed,
  Sparkles,
  ConciergeBell,
  Info,
} from 'lucide-react'

export default async function HotelInfoPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('guest.info')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale ?? defaultLocale}/login`)

  const info = await getHotelInfoAction()

  if (!info) {
    return (
      <div className="min-h-screen pb-24 flex flex-col items-center justify-center px-6" style={{ background: '#F8F0E8' }}>
        <div
          className="rounded-2xl bg-white p-10 text-center max-w-sm w-full"
          style={{ boxShadow: '0 2px 16px rgba(27,45,91,0.08)' }}
        >
          <div
            className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl"
            style={{ background: 'rgba(201,168,76,0.1)' }}
          >
            <Info className="size-8" style={{ color: '#C9A84C' }} strokeWidth={1.5} />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: '#C9A84C' }}>
            HELIOS Hotel
          </p>
          <p className="font-heading text-lg font-bold" style={{ color: '#1B2D5B' }}>
            {t('title')}
          </p>
          <p className="text-sm mt-2" style={{ color: '#7A8BA8' }}>
            {t('noInfo')}
          </p>
        </div>
      </div>
    )
  }

  const restaurantHours = (info.restaurant_hours as { name: string; hours: string }[] | null) ?? []

  return (
    <div className="min-h-screen pb-28" style={{ background: '#F8F0E8' }}>
      <div className="px-4 pt-8 pb-6 max-w-2xl mx-auto space-y-5">

        {/* Header */}
        <div
          className="rounded-3xl p-6 relative overflow-hidden"
          style={{ background: '#1B2D5B' }}
        >
          <div
            className="pointer-events-none absolute -top-8 -right-8 size-36 rounded-full opacity-10"
            style={{ background: '#C9A84C' }}
          />
          <div
            className="pointer-events-none absolute top-14 -right-4 size-20 rounded-full opacity-5"
            style={{ background: '#C9A84C' }}
          />
          <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: '#C9A84C' }}>
            HELIOS Hotel
          </p>
          <h1 className="font-heading text-2xl font-bold" style={{ color: '#F8F0E8' }}>
            {t('title')}
          </h1>
          {info.tagline && (
            <p className="text-sm mt-2" style={{ color: 'rgba(248,240,232,0.65)' }}>
              {info.tagline}
            </p>
          )}
        </div>

        {/* Contact */}
        {(info.phone || info.email) && (
          <InfoCard
            label="Contact"
            icon={<Phone className="size-5" style={{ color: '#1B2D5B' }} strokeWidth={1.8} />}
          >
            <div className="space-y-3">
              {info.phone && (
                <a
                  href={`tel:${info.phone}`}
                  className="flex items-center gap-3 group"
                >
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: 'rgba(27,45,91,0.06)' }}
                  >
                    <Phone className="size-4" style={{ color: '#1B2D5B' }} strokeWidth={1.8} />
                  </div>
                  <span className="text-sm font-medium group-hover:underline" style={{ color: '#1B2D5B' }}>
                    {info.phone}
                  </span>
                </a>
              )}
              {info.email && (
                <a
                  href={`mailto:${info.email}`}
                  className="flex items-center gap-3 group"
                >
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: 'rgba(27,45,91,0.06)' }}
                  >
                    <Mail className="size-4" style={{ color: '#1B2D5B' }} strokeWidth={1.8} />
                  </div>
                  <span className="text-sm font-medium group-hover:underline" style={{ color: '#1B2D5B' }}>
                    {info.email}
                  </span>
                </a>
              )}
            </div>
          </InfoCard>
        )}

        {/* Check-in / Check-out */}
        {(info.checkin_time || info.checkout_time) && (
          <InfoCard
            label="Horaires"
            icon={<Clock className="size-5" style={{ color: '#1B2D5B' }} strokeWidth={1.8} />}
          >
            <div className="grid grid-cols-2 gap-3">
              {info.checkin_time && (
                <div
                  className="rounded-xl p-4 text-center"
                  style={{ background: 'rgba(27,45,91,0.04)', border: '1px solid rgba(27,45,91,0.06)' }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#C9A84C' }}>
                    Check-in
                  </p>
                  <p className="font-heading text-2xl font-bold" style={{ color: '#1B2D5B' }}>
                    {info.checkin_time}
                  </p>
                </div>
              )}
              {info.checkout_time && (
                <div
                  className="rounded-xl p-4 text-center"
                  style={{ background: 'rgba(27,45,91,0.04)', border: '1px solid rgba(27,45,91,0.06)' }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#C9A84C' }}>
                    Check-out
                  </p>
                  <p className="font-heading text-2xl font-bold" style={{ color: '#1B2D5B' }}>
                    {info.checkout_time}
                  </p>
                </div>
              )}
            </div>
          </InfoCard>
        )}

        {/* Wi-Fi */}
        {(info.wifi_network || info.wifi_password) && (
          <InfoCard
            label="Wi-Fi"
            icon={<Wifi className="size-5" style={{ color: '#1B2D5B' }} strokeWidth={1.8} />}
          >
            <div className="space-y-2">
              {info.wifi_network && (
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: '#7A8BA8' }}>Réseau</span>
                  <span
                    className="rounded-lg px-3 py-1 font-mono text-sm font-semibold"
                    style={{ background: 'rgba(27,45,91,0.06)', color: '#1B2D5B' }}
                  >
                    {info.wifi_network}
                  </span>
                </div>
              )}
              {info.wifi_password && (
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: '#7A8BA8' }}>Mot de passe</span>
                  <span
                    className="rounded-lg px-3 py-1 font-mono text-sm font-semibold"
                    style={{ background: 'rgba(201,168,76,0.12)', color: '#1B2D5B', border: '1px solid rgba(201,168,76,0.3)' }}
                  >
                    {info.wifi_password}
                  </span>
                </div>
              )}
            </div>
          </InfoCard>
        )}

        {/* Restaurants */}
        {restaurantHours.length > 0 && (
          <InfoCard
            label="Restaurants & Horaires"
            icon={<UtensilsCrossed className="size-5" style={{ color: '#1B2D5B' }} strokeWidth={1.8} />}
          >
            <div className="space-y-2">
              {restaurantHours.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl px-4 py-3"
                  style={{ background: 'rgba(27,45,91,0.03)', border: '1px solid rgba(27,45,91,0.05)' }}
                >
                  <span className="text-sm font-semibold" style={{ color: '#1B2D5B' }}>
                    {r.name}
                  </span>
                  <span className="text-xs font-medium" style={{ color: '#7A8BA8' }}>
                    {r.hours}
                  </span>
                </div>
              ))}
            </div>
          </InfoCard>
        )}

        {/* Room amenities */}
        {info.room_amenities && info.room_amenities.length > 0 && (
          <InfoCard
            label="Équipements chambre"
            icon={<Sparkles className="size-5" style={{ color: '#1B2D5B' }} strokeWidth={1.8} />}
          >
            <div className="flex flex-wrap gap-2">
              {info.room_amenities.map((a, i) => (
                <span
                  key={i}
                  className="rounded-full px-3 py-1 text-xs font-medium"
                  style={{ background: 'rgba(27,45,91,0.06)', color: '#1B2D5B' }}
                >
                  {a}
                </span>
              ))}
            </div>
          </InfoCard>
        )}

        {/* Hotel services */}
        {info.hotel_services && info.hotel_services.length > 0 && (
          <InfoCard
            label="Services de l'hôtel"
            icon={<ConciergeBell className="size-5" style={{ color: '#1B2D5B' }} strokeWidth={1.8} />}
          >
            <div className="space-y-2">
              {info.hotel_services.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ background: '#C9A84C' }}
                  />
                  <span className="text-sm" style={{ color: '#1B2D5B' }}>
                    {s}
                  </span>
                </div>
              ))}
            </div>
          </InfoCard>
        )}

      </div>
    </div>
  )
}

function InfoCard({
  label,
  icon,
  children,
}: {
  label: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div
      className="rounded-2xl bg-white p-5"
      style={{ boxShadow: '0 2px 16px rgba(27,45,91,0.08)' }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-xl"
          style={{ background: 'rgba(27,45,91,0.06)' }}
        >
          {icon}
        </div>
        <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#C9A84C' }}>
          {label}
        </p>
      </div>
      {children}
    </div>
  )
}
