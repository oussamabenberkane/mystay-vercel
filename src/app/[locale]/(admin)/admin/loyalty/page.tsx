import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { defaultLocale } from '@/lib/i18n/config'
import { getLoyaltyOffersAdminAction } from '@/lib/actions/loyalty'
import { LoyaltyAdminClient } from './_components/loyalty-admin-client'

export default async function AdminLoyaltyPage({
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

  const { offers } = await getLoyaltyOffersAdminAction()

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-1"
          style={{ color: '#C9A84C' }}
        >
          Fidélité
        </p>
        <h1 className="font-heading text-3xl font-bold" style={{ color: '#1B2D5B' }}>
          Offres de fidélité
        </h1>
        <p className="mt-1 text-sm" style={{ color: '#7A8BA8' }}>
          {offers.length} offre{offers.length !== 1 ? 's' : ''}
        </p>
      </div>

      <LoyaltyAdminClient initialOffers={offers} />
    </div>
  )
}
