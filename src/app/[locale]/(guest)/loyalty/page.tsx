import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { defaultLocale } from '@/lib/i18n/config'
import { getLoyaltyAction, getLoyaltyOffersAction } from '@/lib/actions/loyalty'
import { LoyaltyClient } from './_components/loyalty-client'

export default async function LoyaltyPage({
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
  if (!profile || profile.role !== 'client') redirect(`/${locale ?? defaultLocale}/login`)

  const [{ balance, transactions }, { offers }] = await Promise.all([
    getLoyaltyAction(),
    getLoyaltyOffersAction(),
  ])

  return (
    <LoyaltyClient
      initialBalance={balance}
      initialTransactions={transactions}
      initialOffers={offers}
    />
  )
}
