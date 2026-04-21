'use client'

import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import type { RequestStatus } from '@/lib/actions/service-requests'

const STATUS_STYLE: Record<
  RequestStatus,
  { bg: string; text: string; dot: string; pulse: boolean }
> = {
  pending:     { bg: '#FEF9EC', text: '#92600A', dot: '#F59E0B', pulse: false },
  in_progress: { bg: '#EFF6FF', text: '#1E40AF', dot: '#3B82F6', pulse: true  },
  completed:   { bg: '#F0FDF4', text: '#166534', dot: '#22C55E', pulse: false },
  cancelled:   { bg: '#FEF2F2', text: '#991B1B', dot: '#EF4444', pulse: false },
}

export function RequestStatusBadge({
  status,
  className,
  flash,
}: {
  status: RequestStatus
  className?: string
  flash?: boolean
}) {
  const t = useTranslations('status')
  const style = STATUS_STYLE[status] ?? STATUS_STYLE.pending

  return (
    <span
      className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold', flash && 'status-updated', className)}
      style={{ background: style.bg, color: style.text }}
    >
      <span className="relative flex size-2">
        {style.pulse && (
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
            style={{ background: style.dot }}
          />
        )}
        <span
          className="relative inline-flex size-2 rounded-full"
          style={{ background: style.dot }}
        />
      </span>
      {t(status)}
    </span>
  )
}
