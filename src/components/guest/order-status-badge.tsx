import { cn } from '@/lib/utils'
import type { OrderStatus } from '@/lib/actions/room-service'

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; bg: string; text: string; dot: string; pulse: boolean }
> = {
  pending:   { label: 'Pending',    bg: '#FEF9EC', text: '#92600A', dot: '#F59E0B', pulse: false },
  confirmed: { label: 'Confirmed',  bg: '#EFF6FF', text: '#1E40AF', dot: '#3B82F6', pulse: false },
  preparing: { label: 'Preparing',  bg: '#FFF7ED', text: '#9A3412', dot: '#F97316', pulse: true  },
  delivering:{ label: 'On the way', bg: '#F5F3FF', text: '#5B21B6', dot: '#8B5CF6', pulse: true  },
  delivered: { label: 'Delivered',  bg: '#F0FDF4', text: '#166534', dot: '#22C55E', pulse: false },
  cancelled: { label: 'Cancelled',  bg: '#FEF2F2', text: '#991B1B', dot: '#EF4444', pulse: false },
}

export function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatus
  className?: string
}) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending

  return (
    <span
      className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold', className)}
      style={{ background: config.bg, color: config.text }}
    >
      <span className="relative flex size-2">
        {config.pulse && (
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
            style={{ background: config.dot }}
          />
        )}
        <span
          className="relative inline-flex size-2 rounded-full"
          style={{ background: config.dot }}
        />
      </span>
      {config.label}
    </span>
  )
}
