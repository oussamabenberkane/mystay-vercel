import { cn } from '@/lib/utils'
import type { RequestPriority } from '@/lib/actions/service-requests'

const PRIORITY_CONFIG: Record<
  RequestPriority,
  { label: string; bg: string; text: string }
> = {
  urgent: { label: 'Urgent', bg: '#FEF2F2', text: '#991B1B' },
  normal: { label: 'Normal', bg: '#F8F0E8', text: '#7A8BA8' },
}

export function PriorityBadge({
  priority,
  className,
}: {
  priority: RequestPriority
  className?: string
}) {
  const config = PRIORITY_CONFIG[priority]

  return (
    <span
      className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', className)}
      style={{ background: config.bg, color: config.text }}
    >
      {priority === 'urgent' && <span className="mr-1">!</span>}
      {config.label}
    </span>
  )
}
