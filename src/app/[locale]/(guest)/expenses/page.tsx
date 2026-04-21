import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { defaultLocale } from '@/lib/i18n/config'
import { getTranslations } from 'next-intl/server'
import { Receipt } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const statusColors: Record<string, string> = {
  pending: '#C9A84C',
  confirmed: '#1B9A59',
  paid: '#1B2D5B',
}

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
    .select('id, amount, status, created_at')
    .eq('guest_id', user.id)
    .order('created_at', { ascending: false })

  const rows = (expenses ?? []) as { id: string; amount: number; status: string; created_at: string }[]
  const total = rows.reduce((sum, e) => sum + (e.amount ?? 0), 0)

  return (
    <div className="min-h-screen pb-24" style={{ background: '#F8F0E8' }}>
      <div className="px-4 pt-8 pb-6 max-w-2xl mx-auto space-y-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#C9A84C' }}>
            {/* TODO: i18n */}
            Billing
          </p>
          <h1 className="font-heading text-3xl font-bold" style={{ color: '#1B2D5B' }}>
            {t('title')}
          </h1>
        </div>

        {/* Total */}
        <div
          className="rounded-2xl px-5 py-4 flex items-center justify-between"
          style={{ background: 'rgba(201,168,76,0.1)', border: '1.5px solid rgba(201,168,76,0.2)' }}
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#C9A84C' }}>
              {/* TODO: i18n */}
              Outstanding Balance
            </p>
            <p className="font-heading text-3xl font-bold mt-0.5" style={{ color: '#1B2D5B' }}>
              {formatCurrency(total)}
            </p>
          </div>
          <Receipt className="size-8 opacity-30" style={{ color: '#C9A84C' }} />
        </div>

        {/* Line items */}
        {rows.length === 0 ? (
          <div className="card-warm p-8 text-center">
            <Receipt className="size-10 mx-auto mb-3" style={{ color: '#C9A84C', opacity: 0.5 }} />
            <p className="font-heading text-lg font-semibold" style={{ color: '#1B2D5B' }}>{t('empty')}</p>
            <p className="text-sm mt-1" style={{ color: '#7A8BA8' }}>
              {/* TODO: i18n */}
              Your charges will appear here.
            </p>
          </div>
        ) : (
          <div className="card-warm divide-y" style={{ borderColor: 'rgba(27,45,91,0.05)' }}>
            {rows.map((e, i) => (
              <div key={e.id} className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: '#1B2D5B' }}>
                    {/* TODO: i18n */}
                    Charge #{String(i + 1).padStart(3, '0')}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#7A8BA8' }}>
                    {formatDate(e.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{
                      background: `${statusColors[e.status] ?? '#7A8BA8'}18`,
                      color: statusColors[e.status] ?? '#7A8BA8',
                    }}
                  >
                    {e.status}
                  </span>
                  <span className="text-sm font-semibold" style={{ color: '#1B2D5B' }}>
                    {formatCurrency(e.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-xs" style={{ color: '#7A8BA8' }}>
          {/* TODO: i18n */}
          All charges are added to your room bill and settled upon check-out.
        </p>
      </div>
    </div>
  )
}
