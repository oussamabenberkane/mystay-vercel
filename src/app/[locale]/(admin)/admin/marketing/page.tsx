import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { defaultLocale } from '@/lib/i18n/config'
import {
  getAdBannersAdminAction,
  getFlashSalesAdminAction,
  getShowcaseHotelsAdminAction,
} from '@/lib/actions/admin-promos'
import { MarketingClient } from './_components/marketing-client'

export default async function MarketingPage({
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

  const t = await getTranslations('adminPromos')

  const [{ banners }, { sales }, { hotels }] = await Promise.all([
    getAdBannersAdminAction(),
    getFlashSalesAdminAction(),
    getShowcaseHotelsAdminAction(),
  ])

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-1"
          style={{ color: '#C9A84C' }}
        >
          {t('eyebrow')}
        </p>
        <h1 className="font-heading text-3xl font-bold" style={{ color: '#1B2D5B' }}>
          {t('title')}
        </h1>
        <p className="mt-1 text-sm" style={{ color: '#7A8BA8' }}>
          {t('subtitle')}
        </p>
      </div>

      <MarketingClient
        initialBanners={banners}
        initialSales={sales}
        initialHotels={hotels}
      />
    </div>
  )
}
