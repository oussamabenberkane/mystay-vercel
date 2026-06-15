import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { defaultLocale } from '@/lib/i18n/config'
import { getTranslations } from 'next-intl/server'
import { isChargilyConfigured } from '@/lib/actions/payments'
import { ExpensesClient, type ExpenseRow } from './_components/expenses-client'

export default async function ExpensesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('guest.expenses')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale ?? defaultLocale}/login`)

  const { data: expenses } = await supabase
    .from('expenses')
    .select('id, amount, status, created_at, payment_status, payment_method')
    .eq('guest_id', user.id)
    .order('created_at', { ascending: false })

  const rows = (expenses ?? []) as ExpenseRow[]
  const cardEnabled = await isChargilyConfigured()

  return (
    <ExpensesClient
      title={t('title')}
      expenses={rows}
      cardEnabled={cardEnabled}
    />
  )
}
