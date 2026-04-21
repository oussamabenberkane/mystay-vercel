import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminSidebarNav } from '@/components/admin/sidebar-nav'
import { defaultLocale } from '@/lib/i18n/config'

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale ?? defaultLocale}/login`)

  const { data: profileData } = await supabase
    .from('profiles')
    .select('role, full_name, hotel_id')
    .eq('id', user.id)
    .single()

  const profile = profileData as { role: string; full_name: string; hotel_id: string } | null
  if (!profile || profile.role !== 'admin') {
    redirect(`/${locale ?? defaultLocale}/login`)
  }

  const { data: hotelData } = await supabase
    .from('hotels')
    .select('name')
    .eq('id', profile.hotel_id)
    .single()

  const hotel = hotelData as { name: string } | null

  return (
    <div className="flex min-h-screen" style={{ background: '#F8F0E8' }}>
      <AdminSidebarNav
        hotelName={hotel?.name ?? 'My Stay'}
        adminName={profile.full_name}
      />
      <main className="flex-1 overflow-auto min-w-0">{children}</main>
    </div>
  )
}
