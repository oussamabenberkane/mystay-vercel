'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Receipt, CreditCard, Building2, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { formatCurrency } from '@/lib/utils/format'
import { PaymentStatusBadge } from '@/components/shared/payment-status-badge'
import {
  startCardPaymentAction,
  chooseReceptionPaymentAction,
} from '@/lib/actions/payments'

export type ExpenseRow = {
  id: string
  amount: number
  status: string
  created_at: string
  payment_status: string
  payment_method: 'app_card' | 'reception' | null
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function PaymentChoice({
  row,
  cardEnabled,
  onChanged,
}: {
  row: ExpenseRow
  cardEnabled: boolean
  onChanged: () => void
}) {
  const t = useTranslations('payment')
  const [busy, setBusy] = useState<'card' | 'reception' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function payByCard() {
    setBusy('card')
    setError(null)
    const { data, error } = await startCardPaymentAction(row.id)
    if (error || !data) {
      setError(error ?? t('errorGeneric'))
      setBusy(null)
      return
    }
    // Redirect to Chargily hosted checkout.
    window.location.href = data.checkoutUrl
  }

  async function payAtReception() {
    setBusy('reception')
    setError(null)
    const { error } = await chooseReceptionPaymentAction(row.id)
    if (error) {
      setError(error)
      setBusy(null)
      return
    }
    setBusy(null)
    onChanged()
  }

  // pending app_card already has a checkout in flight — don't offer the choice again,
  // but still allow switching to reception if they abandoned the card flow.
  return (
    <div className="mt-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {cardEnabled && (
          <button
            onClick={payByCard}
            disabled={busy !== null}
            className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all active:scale-[0.98] disabled:opacity-60"
            style={{ background: '#1B2D5B', color: '#F8F0E8' }}
          >
            {busy === 'card' ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <CreditCard className="size-3.5" />
            )}
            {busy === 'card' ? t('redirecting') : t('payByCard')}
          </button>
        )}
        <button
          onClick={payAtReception}
          disabled={busy !== null}
          className="flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all active:scale-[0.98] disabled:opacity-60"
          style={{
            borderColor: 'rgba(27,45,91,0.15)',
            color: '#1B2D5B',
            gridColumn: cardEnabled ? undefined : 'span 2',
          }}
        >
          {busy === 'reception' ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Building2 className="size-3.5" />
          )}
          {t('payAtReception')}
        </button>
      </div>
      {!cardEnabled && (
        <p className="text-[11px]" style={{ color: '#7A8BA8' }}>
          {t('unavailable')}
        </p>
      )}
      {error && (
        <p className="text-[11px]" style={{ color: '#EF4444' }}>
          {error}
        </p>
      )}
    </div>
  )
}

export function ExpensesClient({
  title,
  expenses,
  cardEnabled,
}: {
  title: string
  expenses: ExpenseRow[]
  cardEnabled: boolean
}) {
  const t = useTranslations('payment')
  const tg = useTranslations('guest.expenses')
  const router = useRouter()
  const searchParams = useSearchParams()
  const [banner, setBanner] = useState<'success' | 'failed' | null>(null)

  const paymentResult = searchParams.get('payment')
  useEffect(() => {
    if (paymentResult === 'success') setBanner('success')
    else if (paymentResult === 'failed') setBanner('failed')
    if (paymentResult) {
      // Clean the URL so a refresh doesn't re-show the banner.
      const sp = new URLSearchParams(Array.from(searchParams.entries()))
      sp.delete('payment')
      sp.delete('order')
      const qs = sp.toString()
      router.replace(qs ? `?${qs}` : '?', { scroll: false })
      // Pull fresh payment status after returning from checkout.
      router.refresh()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentResult])

  const outstanding = expenses
    .filter((e) => e.payment_status !== 'paid')
    .reduce((sum, e) => sum + (e.amount ?? 0), 0)

  return (
    <div className="min-h-screen pb-24" style={{ background: '#F8F0E8' }}>
      <div className="px-4 pt-8 pb-6 max-w-2xl mx-auto space-y-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#C9A84C' }}>
            {t('title')}
          </p>
          <h1 className="font-heading text-3xl font-bold" style={{ color: '#1B2D5B' }}>
            {title}
          </h1>
        </div>

        {banner && (
          <div
            className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium"
            style={
              banner === 'success'
                ? { background: 'rgba(27,154,89,0.12)', color: '#1B9A59' }
                : { background: 'rgba(239,68,68,0.1)', color: '#EF4444' }
            }
          >
            {banner === 'success' ? (
              <CheckCircle2 className="size-4 shrink-0" />
            ) : (
              <XCircle className="size-4 shrink-0" />
            )}
            {banner === 'success' ? t('successMsg') : t('failedMsg')}
          </div>
        )}

        {/* Outstanding total */}
        <div
          className="rounded-2xl px-5 py-4 flex items-center justify-between"
          style={{ background: 'rgba(201,168,76,0.1)', border: '1.5px solid rgba(201,168,76,0.2)' }}
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#C9A84C' }}>
              {t('outstanding')}
            </p>
            <p className="font-heading text-3xl font-bold mt-0.5" style={{ color: '#1B2D5B' }}>
              {formatCurrency(outstanding)}
            </p>
          </div>
          <Receipt className="size-8 opacity-30" style={{ color: '#C9A84C' }} />
        </div>

        {/* Line items */}
        {expenses.length === 0 ? (
          <div className="card-warm p-8 text-center">
            <Receipt className="size-10 mx-auto mb-3" style={{ color: '#C9A84C', opacity: 0.5 }} />
            <p className="font-heading text-lg font-semibold" style={{ color: '#1B2D5B' }}>{tg('empty')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {expenses.map((e, i) => {
              const canPay = e.payment_status === 'unpaid' || e.payment_status === 'pending'
              return (
                <div
                  key={e.id}
                  className="card-warm px-5 py-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#1B2D5B' }}>
                        #{String(i + 1).padStart(3, '0')} · {formatCurrency(e.amount)}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: '#7A8BA8' }}>
                        {formatDate(e.created_at)}
                      </p>
                    </div>
                    <PaymentStatusBadge status={e.payment_status} method={e.payment_method} />
                  </div>

                  {canPay && (
                    <PaymentChoice
                      row={e}
                      cardEnabled={cardEnabled}
                      onChanged={() => router.refresh()}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
