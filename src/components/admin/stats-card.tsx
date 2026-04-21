import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Variant = 'default' | 'warning' | 'danger'

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  subtitle?: string
  variant?: Variant
  badge?: number
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  subtitle,
  variant = 'default',
  badge,
}: StatsCardProps) {
  const iconBg =
    variant === 'warning'
      ? 'rgba(201,168,76,0.12)'
      : variant === 'danger'
        ? 'rgba(192,57,43,0.08)'
        : 'rgba(27,45,91,0.06)'

  const iconColor =
    variant === 'warning' ? '#C9A84C' : variant === 'danger' ? '#C0392B' : '#1B2D5B'

  const borderStyle =
    variant === 'danger'
      ? { border: '1.5px solid rgba(192,57,43,0.18)' }
      : variant === 'warning'
        ? { border: '1.5px solid rgba(201,168,76,0.20)' }
        : {}

  return (
    <div
      className="card-warm p-5 flex items-start gap-4 relative overflow-hidden"
      style={borderStyle}
    >
      <div
        className="flex size-11 shrink-0 items-center justify-center rounded-xl"
        style={{ background: iconBg }}
      >
        <Icon className="size-5" style={{ color: iconColor }} strokeWidth={1.8} />
      </div>

      <div className="flex-1 min-w-0">
        <p
          className="text-[11px] font-semibold uppercase tracking-widest mb-1"
          style={{ color: '#7A8BA8' }}
        >
          {title}
        </p>
        <div className="flex items-center gap-2">
          <p
            className="font-heading text-3xl font-bold leading-none"
            style={{ color: '#1B2D5B' }}
          >
            {value}
          </p>
          {badge !== undefined && badge > 0 && (
            <span
              className="inline-flex items-center justify-center size-5 rounded-full text-[10px] font-bold text-white"
              style={{ background: variant === 'warning' ? '#C9A84C' : '#C0392B' }}
            >
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs mt-1" style={{ color: '#7A8BA8' }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}
