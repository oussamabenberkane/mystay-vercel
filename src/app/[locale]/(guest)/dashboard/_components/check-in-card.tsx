'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { LogIn, LogOut, CheckCircle2, Clock, DoorOpen } from 'lucide-react'
import {
  checkInAction,
  checkOutAction,
  type GuestStay,
} from '@/lib/actions/stay-status'

type Phase = 'reserved' | 'checked_in' | 'checked_out'

function phaseOf(stay: GuestStay): Phase {
  if (stay.checked_out_at || stay.status === 'checked_out' || stay.status === 'archived') {
    return 'checked_out'
  }
  if (stay.checked_in_at || stay.status === 'active' || stay.status === 'checked_in') {
    return 'checked_in'
  }
  return 'reserved'
}

function formatStamp(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function CheckInCard({ stay, locale }: { stay: GuestStay; locale: string }) {
  const t = useTranslations('checkin')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [current, setCurrent] = useState<GuestStay>(stay)
  const [error, setError] = useState<string | null>(null)

  const phase = phaseOf(current)
  const isRtl = locale === 'ar'

  function runCheckIn() {
    setError(null)
    startTransition(async () => {
      const result = await checkInAction(current.id)
      if (result.error) {
        setError(result.error)
        return
      }
      if (result.data) setCurrent(result.data)
      router.refresh()
    })
  }

  function runCheckOut() {
    setError(null)
    startTransition(async () => {
      const result = await checkOutAction(current.id)
      if (result.error) {
        setError(result.error)
        return
      }
      if (result.data) setCurrent(result.data)
      router.refresh()
    })
  }

  const statusMeta: Record<Phase, { label: string; bg: string; fg: string }> = {
    reserved: { label: t('statusReserved'), bg: 'rgba(201,168,76,0.14)', fg: '#9a7d2e' },
    checked_in: { label: t('statusCheckedIn'), bg: 'rgba(22,163,74,0.12)', fg: '#15803d' },
    checked_out: { label: t('statusCheckedOut'), bg: 'rgba(27,45,91,0.07)', fg: '#7A8BA8' },
  }
  const meta = statusMeta[phase]

  return (
    <div
      className="rounded-2xl bg-white p-5"
      style={{ boxShadow: '0 2px 16px rgba(27,45,91,0.08)' }}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-xl"
            style={{ background: 'rgba(27,45,91,0.06)' }}
          >
            <DoorOpen className="size-5" style={{ color: '#1B2D5B' }} strokeWidth={1.8} />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#C9A84C' }}>
            {t('title')}
          </p>
        </div>
        <span
          className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold"
          style={{ background: meta.bg, color: meta.fg }}
        >
          {meta.label}
        </span>
      </div>

      {/* Timestamps */}
      {(current.checked_in_at || current.checked_out_at) && (
        <div className="mb-4 space-y-2">
          {current.checked_in_at && (
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="size-4 shrink-0" style={{ color: '#15803d' }} strokeWidth={1.8} />
              <span className="text-sm" style={{ color: '#1B2D5B' }}>
                {t('checkedInAt')}{' '}
                <span className="font-semibold">{formatStamp(current.checked_in_at)}</span>
              </span>
            </div>
          )}
          {current.checked_out_at && (
            <div className="flex items-center gap-2.5">
              <Clock className="size-4 shrink-0" style={{ color: '#7A8BA8' }} strokeWidth={1.8} />
              <span className="text-sm" style={{ color: '#1B2D5B' }}>
                {t('checkedOutAt')}{' '}
                <span className="font-semibold">{formatStamp(current.checked_out_at)}</span>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Helper text by phase */}
      <p className="text-sm mb-4" style={{ color: '#7A8BA8' }}>
        {phase === 'reserved' && t('reservedHint')}
        {phase === 'checked_in' && t('checkedInHint')}
        {phase === 'checked_out' && t('checkedOutHint')}
      </p>

      {error && (
        <p
          className="text-sm rounded-xl px-3 py-2 mb-4"
          style={{ background: 'rgba(192,57,43,0.08)', color: '#C0392B' }}
        >
          {error}
        </p>
      )}

      {/* Actions */}
      {phase === 'reserved' && (
        <button
          onClick={runCheckIn}
          disabled={isPending}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: '#1B2D5B', color: '#F8F0E8' }}
        >
          <LogIn className="size-4" strokeWidth={2} />
          {isPending ? t('processing') : t('checkInButton')}
        </button>
      )}

      {phase === 'checked_in' && (
        <button
          onClick={runCheckOut}
          disabled={isPending}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: '#C9A84C', color: '#1B2D5B' }}
        >
          <LogOut className="size-4" strokeWidth={2} />
          {isPending ? t('processing') : t('checkOutButton')}
        </button>
      )}

      {phase === 'checked_out' && (
        <div
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold"
          style={{ background: 'rgba(27,45,91,0.04)', color: '#7A8BA8' }}
        >
          <CheckCircle2 className="size-4" strokeWidth={2} />
          {t('checkedOutConfirm')}
        </div>
      )}
    </div>
  )
}
