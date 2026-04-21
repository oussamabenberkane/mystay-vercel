'use client'

import { Brush, Droplets, Wrench, Ellipsis } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RequestType } from '@/lib/actions/service-requests'

const REQUEST_TYPES: {
  key: RequestType
  label: string
  icon: React.ElementType
  color: string
}[] = [
  { key: 'cleaning',    label: 'Cleaning',     icon: Brush,     color: '#3B82F6' },
  { key: 'towels',      label: 'Fresh Towels', icon: Droplets,  color: '#06B6D4' },
  { key: 'maintenance', label: 'Maintenance',  icon: Wrench,    color: '#F59E0B' },
  { key: 'other',       label: 'Other',        icon: Ellipsis,  color: '#8B5CF6' },
]

export function RequestTypeSelector({
  value,
  onChange,
  error,
}: {
  value: RequestType | null
  onChange: (type: RequestType) => void
  error?: string
}) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        {REQUEST_TYPES.map(({ key, label, icon: Icon, color }) => {
          const selected = value === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={cn(
                'flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 px-4 py-4 transition-all duration-150 active:scale-[0.97]',
                selected ? 'scale-[1.02]' : 'hover:scale-[1.01] hover:shadow-md'
              )}
              style={{
                background: selected ? `${color}10` : '#FFFFFF',
                borderColor: selected ? color : 'rgba(27,45,91,0.10)',
                boxShadow: selected
                  ? `0 0 0 3px ${color}20, 0 2px 12px rgba(27,45,91,0.08)`
                  : '0 2px 8px rgba(27,45,91,0.06)',
              }}
            >
              <div
                className="flex size-11 items-center justify-center rounded-xl"
                style={{
                  background: selected ? `${color}18` : 'rgba(27,45,91,0.05)',
                }}
              >
                <Icon
                  className="size-5"
                  style={{ color: selected ? color : '#1B2D5B' }}
                />
              </div>
              <span
                className="text-xs font-semibold"
                style={{ color: selected ? color : '#1B2D5B' }}
              >
                {label}
              </span>
            </button>
          )
        })}
      </div>
      {error && (
        <p className="mt-2 text-xs" style={{ color: '#991B1B' }}>
          {error}
        </p>
      )}
    </div>
  )
}

export { REQUEST_TYPES }
