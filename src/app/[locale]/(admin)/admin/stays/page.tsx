import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { defaultLocale } from '@/lib/i18n/config'
import { StaysClient } from './_components/stays-client'

export default async function StaysPage({
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
    .select('hotel_id, role')
    .eq('id', user.id)
    .single()

  const profile = profileData as { hotel_id: string; role: string } | null
  if (!profile || profile.role !== 'admin') redirect(`/${locale ?? defaultLocale}/login`)

  const hotelId = profile.hotel_id

  const [staysResult, guestsResult, roomsResult] = await Promise.all([
    supabase
      .from('stays')
      .select('*, rooms(number, type), profiles!guest_id(full_name, email)')
      .eq('hotel_id', hotelId)
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('hotel_id', hotelId)
      .eq('role', 'client')
      .order('full_name'),
    supabase
      .from('rooms')
      .select('id, number, type, floor')
      .eq('hotel_id', hotelId)
      .order('number'),
  ])

  const stays = (staysResult.data ?? []) as any[]
  const guests = (guestsResult.data ?? []) as any[]
  const rooms = (roomsResult.data ?? []) as any[]

  const activeCount = stays.filter((s) => s.status === 'active').length

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#C9A84C' }}>
          Guest Management
        </p>
        <h1 className="font-heading text-3xl font-bold" style={{ color: '#1B2D5B' }}>
          Stays
        </h1>
        <p className="mt-1 text-sm" style={{ color: '#7A8BA8' }}>
          {activeCount} active · {stays.length} total
        </p>
      </div>

      <StaysClient stays={stays} guests={guests} rooms={rooms} />
    </div>
  )
}
