'use client'

import { useTranslations } from 'next-intl'

export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed'
export type PaymentMethod = 'app_card' | 'reception' | null

const STATUS_STYLE: Record<PaymentStatus, { bg: string; fg: string }> = {
  unpaid:  { bg: 'rgba(122,139,168,0.14)', fg: '#7A8BA8' },
  pending: { bg: 'rgba(201,168,76,0.16)',  fg: '#92600A' },
  paid:    { bg: 'rgba(27,154,89,0.14)',   fg: '#1B9A59' },
  failed:  { bg: 'rgba(239,68,68,0.12)',   fg: '#EF4444' },
}

function normalize(status: string): PaymentStatus {
  return (['unpaid', 'pending', 'paid', 'failed'] as const).includes(status as PaymentStatus)
    ? (status as PaymentStatus)
    : 'unpaid'
}

export function PaymentStatusBadge({
  status,
  method,
}: {
  status: string
  method?: PaymentMethod
}) {
  const t = useTranslations('payment')
  const s = normalize(status)
  const style = STATUS_STYLE[s]

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
        style={{ background: style.bg, color: style.fg }}
      >
        {t(`status.${s}`)}
      </span>
      {method && (
        <span className="text-[10px] font-medium" style={{ color: '#7A8BA8' }}>
          · {t(`method.${method}`)}
        </span>
      )}
    </span>
  )
}
