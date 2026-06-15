import { QRCodeSection } from './_components/qr-code-section'
import { HotelInfoForm } from './_components/hotel-info-form'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { defaultLocale } from '@/lib/i18n/config'
import { getHotelInfoAction } from '@/lib/actions/hotel-info'

export default async function AdminSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale ?? defaultLocale}/login`)

  const { data: profileData } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const profile = profileData as { role: string } | null
  if (!profile || profile.role !== 'admin') redirect(`/${locale ?? defaultLocale}/login`)

  // Public production base URL the QR points at. Drives an absolute https link
  // that loads the app for an unauthenticated visitor (middleware sends them to
  // /{locale}/login from the locale root). Locale-prefixed and trailing-slash safe.
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://my-stay.vercel.app').replace(/\/+$/, '')
  const appUrl = `${baseUrl}/${locale ?? defaultLocale}`
  const hotelInfo = await getHotelInfoAction()

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#1B2D5B' }}>
          Paramètres — My Stay
        </h1>
        <p className="text-sm mt-1" style={{ color: '#7A8BA8' }}>
          Configuration et outils de l'hôtel
        </p>
      </div>

      <QRCodeSection appUrl={appUrl} />

      <HotelInfoForm initialData={hotelInfo} />
    </div>
  )
}
