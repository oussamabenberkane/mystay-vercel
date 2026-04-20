'use client'

import { useState } from 'react'
import { Clock, User, MapPin, Brush, Droplets, Wrench, Ellipsis } from 'lucide-react'
import { RequestStatusBadge } from '@/components/shared/request-status-badge'
import { PriorityBadge } from '@/components/shared/priority-badge'
import { updateServiceRequestStatusAction, type RequestType, type RequestStatus } from '@/lib/actions/service-requests'
import { cn } from '@/lib/utils'

const TYPE_CONFIG: Record<RequestType, { icon: React.ElementType; label: string; color: string }> = {
  cleaning:    { icon: Brush,     label: 'Cleaning',     color: '#3B82F6' },
  towels:      { icon: Droplets,  label: 'Fresh Towels', color: '#06B6D4' },
  maintenance: { icon: Wrench,    label: 'Maintenance',  color: '#F59E0B' },
  other:       { icon: Ellipsis,  label: 'Other',        color: '#8B5CF6' },
}

const STATUS_TRANSITIONS: Partial<Record<RequestStatus, { label: string; next: RequestStatus; isComplete: boolean }>> = {
  pending:     { label: 'Start',    next: 'in_progress', isComplete: false },
  in_progress: { label: 'Complete', next: 'completed',   isComplete: true  },
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export type StaffServiceRequest = {
  id: string
  type: RequestType
  priority: 'normal' | 'urgent'
  status: RequestStatus
  description: string | null
  created_at: string
  stays: { rooms: { number: string; type: string } | null } | null
  profiles: { full_name: string } | null
}

export function StaffRequestCard({
  request,
  onStatusChange,
}: {
  request: StaffServiceRequest
  onStatusChange: (id: string, status: RequestStatus) => void
}) {
  const [loading, setLoading] = useState(false)

  const type = TYPE_CONFIG[request.type]
  const transition = STATUS_TRANSITIONS[request.status]
  const isTerminal = request.status === 'completed' || request.status === 'cancelled'
  const roomNumber = request.stays?.rooms?.number ?? '–'
  const guestName = request.profiles?.full_name ?? 'Guest'
  const urgentBorder = request.priority === 'urgent' ? '#EF4444' : '#C9A84C40'

  async function handleAdvance() {
    if (!transition) return
    setLoading(true)
    const { error } = await updateServiceRequestStatusAction(request.id, transition.next as 'in_progress' | 'completed' | 'cancelled')
    if (!error) onStatusChange(request.id, transition.next)
    setLoading(false)
  }

  async function handleCancel() {
    if (!confirm('Cancel this request?')) return
    setLoading(true)
    const { error } = await updateServiceRequestStatusAction(request.id, 'cancelled')
    if (!error) onStatusChange(request.id, 'cancelled')
    setLoading(false)
  }

  return (
    <div
      className="overflow-hidden rounded-2xl bg-white"
      style={{
        boxShadow: '0 2px 16px rgba(27,45,91,0.08)',
        borderLeft: `4px solid ${urgentBorder}`,
      }}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-xl"
              style={{ background: `${type.color}15` }}
            >
              <type.icon className="size-5" style={{ color: type.color }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading text-sm font-semibold" style={{ color: '#1B2D5B' }}>
                  {type.label}
                </span>
                <PriorityBadge priority={request.priority} />
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: '#7A8BA8' }}>
                <span className="flex items-center gap-1">
                  <MapPin className="size-3" />
                  Room {roomNumber}
                </span>
                <span className="flex items-center gap-1">
                  <User className="size-3" />
                  {guestName}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  {timeAgo(request.created_at)}
                </span>
              </div>
            </div>
          </div>
          <RequestStatusBadge status={request.status} />
        </div>

        {request.description && (
          <p
            className="mt-3 line-clamp-2 rounded-xl px-3 py-2 text-xs"
            style={{ background: '#F8F0E8', color: '#7A8BA8' }}
          >
            {request.description}
          </p>
        )}
      </div>

      {/* Actions */}
      {!isTerminal && (
        <div
          className="flex gap-2 border-t px-5 py-4"
          style={{ borderColor: 'rgba(27,45,91,0.07)' }}
        >
          {transition && (
            <button
              onClick={handleAdvance}
              disabled={loading}
              className={cn(
                'flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all duration-150 active:scale-[0.98] disabled:opacity-60'
              )}
              style={
                transition.isComplete
                  ? { background: '#C9A84C', color: '#1B2D5B' }
                  : { background: '#1B2D5B', color: '#F8F0E8' }
              }
            >
              {loading ? '…' : transition.label}
            </button>
          )}
          <button
            onClick={handleCancel}
            disabled={loading}
            className="rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-150 active:scale-[0.98] disabled:opacity-60"
            style={{ borderColor: 'rgba(27,45,91,0.15)', color: '#7A8BA8' }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
