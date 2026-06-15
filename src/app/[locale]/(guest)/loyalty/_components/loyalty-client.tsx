'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Gift, Sparkles, ArrowUpRight, ArrowDownLeft, Award, History } from 'lucide-react'
import { redeemOfferAction, type LoyaltyOffer, type LoyaltyTransaction } from '@/lib/actions/loyalty'

type ToastMsg = { id: number; message: string; isError: boolean }

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface LoyaltyClientProps {
  initialBalance: number
  initialTransactions: LoyaltyTransaction[]
  initialOffers: LoyaltyOffer[]
}

export function LoyaltyClient({
  initialBalance,
  initialTransactions,
  initialOffers,
}: LoyaltyClientProps) {
  const t = useTranslations('loyalty')
  const [balance, setBalance] = useState(initialBalance)
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>(initialTransactions)
  const [offers] = useState<LoyaltyOffer[]>(initialOffers)
  const [redeemingId, setRedeemingId] = useState<string | null>(null)
  const [confirmOffer, setConfirmOffer] = useState<LoyaltyOffer | null>(null)
  const [toasts, setToasts] = useState<ToastMsg[]>([])

  function showToast(message: string, isError = false) {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, isError }])
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4000)
  }

  function mapRedeemError(code: string): string {
    switch (code) {
      case 'INSUFFICIENT_BALANCE':
        return t('insufficientBalance')
      case 'OFFER_INACTIVE':
        return t('offerInactive')
      case 'OFFER_NOT_FOUND':
        return t('offerNotFound')
      default:
        return t('redeemError')
    }
  }

  async function handleRedeem(offer: LoyaltyOffer) {
    setConfirmOffer(null)
    setRedeemingId(offer.id)
    const result = await redeemOfferAction(offer.id)
    setRedeemingId(null)

    if (result.error) {
      showToast(mapRedeemError(result.error), true)
      return
    }

    if (typeof result.balance === 'number') {
      setBalance(result.balance)
    } else {
      setBalance((b) => Math.max(0, b - offer.points_cost))
    }

    // Optimistically prepend a redemption ledger row for instant feedback.
    setTransactions((prev) => [
      {
        id: `optimistic-${Date.now()}`,
        account_id: '',
        hotel_id: offer.hotel_id,
        delta: -offer.points_cost,
        reason: offer.title,
        ref_type: 'offer',
        ref_id: offer.id,
        created_at: new Date().toISOString(),
      },
      ...prev,
    ])

    showToast(t('redeemSuccess', { title: offer.title }))
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: '#F8F0E8' }}>
      {/* Toasts */}
      <div className="pointer-events-none fixed top-4 left-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((x) => (
          <div
            key={x.id}
            className="rounded-2xl px-4 py-3 text-sm font-semibold shadow-lg"
            style={{
              background: x.isError ? '#FEF2F2' : '#F0FDF4',
              color: x.isError ? '#991B1B' : '#166534',
            }}
          >
            {x.message}
          </div>
        ))}
      </div>

      <div className="px-4 pt-8 pb-6 max-w-2xl mx-auto space-y-6">
        {/* Balance hero */}
        <div className="rounded-3xl p-6 relative overflow-hidden" style={{ background: '#1B2D5B' }}>
          <div
            className="pointer-events-none absolute -top-8 -right-8 size-36 rounded-full opacity-10"
            style={{ background: '#C9A84C' }}
          />
          <div
            className="pointer-events-none absolute top-12 -right-4 size-20 rounded-full opacity-5"
            style={{ background: '#C9A84C' }}
          />
          <div className="flex items-center gap-2 mb-3">
            <Award className="size-4" style={{ color: '#C9A84C' }} />
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#C9A84C' }}>
              {t('subtitle')}
            </p>
          </div>
          <p className="font-heading text-5xl font-bold leading-none" style={{ color: '#F8F0E8' }}>
            {balance.toLocaleString()}
          </p>
          <p className="mt-2 text-sm" style={{ color: 'rgba(248,240,232,0.7)' }}>
            {t('pointsAvailable')}
          </p>
        </div>

        {/* Offers */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Gift className="size-4" style={{ color: '#C9A84C' }} />
            <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#7A8BA8' }}>
              {t('offersTitle')}
            </p>
          </div>

          {offers.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center rounded-2xl py-12"
              style={{ background: 'rgba(255,255,255,0.7)' }}
            >
              <Sparkles className="size-9 mb-3" style={{ color: '#C9A84C', opacity: 0.4 }} />
              <p className="text-sm" style={{ color: '#7A8BA8' }}>
                {t('noOffers')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {offers.map((offer) => {
                const canAfford = balance >= offer.points_cost
                const busy = redeemingId === offer.id
                return (
                  <div
                    key={offer.id}
                    className="rounded-2xl bg-white p-5"
                    style={{ boxShadow: '0 2px 16px rgba(27,45,91,0.08)' }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm leading-snug" style={{ color: '#1B2D5B' }}>
                          {offer.title}
                        </p>
                        {offer.description && (
                          <p className="mt-1 text-xs leading-relaxed" style={{ color: '#7A8BA8' }}>
                            {offer.description}
                          </p>
                        )}
                        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1" style={{ background: 'rgba(201,168,76,0.12)' }}>
                          <Sparkles className="size-3.5" style={{ color: '#C9A84C' }} />
                          <span className="text-xs font-bold" style={{ color: '#1B2D5B' }}>
                            {offer.points_cost.toLocaleString()} {t('points')}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setConfirmOffer(offer)}
                        disabled={!canAfford || busy}
                        className="shrink-0 cursor-pointer rounded-xl px-4 py-2.5 text-xs font-semibold transition-all hover:opacity-90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
                        style={{ background: '#C9A84C', color: '#1B2D5B', minWidth: '88px' }}
                      >
                        {busy ? '…' : canAfford ? t('redeem') : t('notEnough')}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* History */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <History className="size-4" style={{ color: '#C9A84C' }} />
            <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#7A8BA8' }}>
              {t('historyTitle')}
            </p>
          </div>

          {transactions.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center rounded-2xl py-12"
              style={{ background: 'rgba(255,255,255,0.7)' }}
            >
              <History className="size-9 mb-3" style={{ color: '#C9A84C', opacity: 0.4 }} />
              <p className="text-sm" style={{ color: '#7A8BA8' }}>
                {t('noHistory')}
              </p>
            </div>
          ) : (
            <div className="card-warm divide-y" style={{ borderColor: 'rgba(27,45,91,0.05)' }}>
              {transactions.map((txn) => {
                const isEarn = txn.delta >= 0
                return (
                  <div key={txn.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="flex size-9 shrink-0 items-center justify-center rounded-xl"
                        style={{ background: isEarn ? 'rgba(22,163,74,0.1)' : 'rgba(192,57,43,0.08)' }}
                      >
                        {isEarn ? (
                          <ArrowUpRight className="size-4" style={{ color: '#16a34a' }} />
                        ) : (
                          <ArrowDownLeft className="size-4" style={{ color: '#C0392B' }} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: '#1B2D5B' }}>
                          {txn.reason || (isEarn ? t('earned') : t('redeemed'))}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: '#7A8BA8' }}>
                          {formatDateTime(txn.created_at)}
                        </p>
                      </div>
                    </div>
                    <span
                      className="text-sm font-bold shrink-0"
                      style={{ color: isEarn ? '#16a34a' : '#C0392B' }}
                    >
                      {isEarn ? '+' : ''}{txn.delta.toLocaleString()}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Redeem confirmation */}
      {confirmOffer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(27,45,91,0.4)' }}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6"
            style={{ boxShadow: '0 8px 40px rgba(27,45,91,0.14)' }}
          >
            <div className="flex size-12 items-center justify-center rounded-2xl mb-4" style={{ background: 'rgba(201,168,76,0.12)' }}>
              <Gift className="size-6" style={{ color: '#C9A84C' }} />
            </div>
            <p className="font-heading text-lg font-bold mb-1" style={{ color: '#1B2D5B' }}>
              {t('confirmTitle')}
            </p>
            <p className="text-sm mb-1" style={{ color: '#1B2D5B' }}>
              {confirmOffer.title}
            </p>
            <p className="text-sm mb-6" style={{ color: '#7A8BA8' }}>
              {t('confirmBody', { cost: confirmOffer.points_cost.toLocaleString() })}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmOffer(null)}
                className="flex-1 cursor-pointer rounded-xl border py-2.5 text-sm font-semibold transition-colors hover:bg-gray-50"
                style={{ borderColor: 'rgba(27,45,91,0.12)', color: '#7A8BA8' }}
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => handleRedeem(confirmOffer)}
                className="flex-1 cursor-pointer rounded-xl py-2.5 text-sm font-semibold transition-colors hover:opacity-90"
                style={{ background: '#1B2D5B', color: '#F8F0E8' }}
              >
                {t('confirmRedeem')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
