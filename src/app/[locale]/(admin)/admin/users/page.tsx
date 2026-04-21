import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { defaultLocale } from '@/lib/i18n/config'
import { UsersClient } from './_components/users-client'

export default async function UsersPage({
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

  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .eq('hotel_id', profile.hotel_id)
    .order('created_at', { ascending: false })

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#C9A84C' }}>
          Team Management
        </p>
        <h1 className="font-heading text-3xl font-bold" style={{ color: '#1B2D5B' }}>
          Users
        </h1>
        <p className="mt-1 text-sm" style={{ color: '#7A8BA8' }}>
          {users?.length ?? 0} members in your hotel
        </p>
      </div>

      <UsersClient users={(users ?? []) as any[]} hotelId={profile.hotel_id} />
    </div>
  )
}
