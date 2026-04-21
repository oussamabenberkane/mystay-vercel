'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, ClipboardList } from 'lucide-react'
import { StaffRequestCard, type StaffServiceRequest } from '@/components/staff/request-card'
import { RequestStatusBadge } from '@/components/shared/request-status-badge'
import { getStaffServiceRequestsAction, type RequestStatus, type RequestType } from '@/lib/actions/service-requests'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/store/auth-store'

type StatusFilter = 'all' | 'pending' | 'in_progress' | 'completed'
type TypeFilter = 'all' | RequestType
type PriorityFilter = 'all' | 'urgent' | 'normal'

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all',         label: 'All'         },
  { key: 'pending',     label: 'Pending'     },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed',   label: 'Completed'   },
]

const TYPE_FILTERS: { key: TypeFilter; label: string }[] = [
  { key: 'all',         label: 'All Types'   },
  { key: 'cleaning',    label: 'Cleaning'    },
  { key: 'towels',      label: 'Towels'      },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'other',       label: 'Other'       },
]

type ToastMsg = { id: number; message: string }

function matchesFilters(
  req: StaffServiceRequest,
  status: StatusFilter,
  type: TypeFilter,
  priority: PriorityFilter
): boolean {
  if (status !== 'all' && req.status !== status) return false
  if (type !== 'all' && req.type !== type) return false
  if (priority !== 'all' && req.priority !== priority) return false
  return true
}

function CountPill({ count, status }: { count: number; status: RequestStatus }) {
  return (
    <div className="flex items-center gap-2">
      <RequestStatusBadge status={status} />
      <span
        className="flex size-5 items-center justify-center rounded-full text-[10px] font-bold"
        style={{ background: '#1B2D5B', color: '#F8F0E8' }}
      >
        {count}
      </span>
    </div>
  )
}

export default function StaffRequestsPage() {
  const profile = useAuthStore((s) => s.profile)

  const [requests, setRequests] = useState<StaffServiceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [toasts, setToasts] = useState<ToastMsg[]>([])
  const [newIds, setNewIds] = useState<Set<string>>(new Set())
  const seenIdsRef = useRef<Set<string>>(new Set())

  function showToast(message: string) {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000)
  }

  useEffect(() => {
    async function init() {
      const { requests: raw } = await getStaffServiceRequestsAction()
      const mapped = raw as StaffServiceRequest[]
      mapped.forEach((r) => seenIdsRef.current.add(r.id))
      setRequests(mapped)
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => {
    if (!profile?.hotel_id) return
    const supabase = createClient()
    const channel = supabase
      .channel(`hotel-requests:${profile.hotel_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'service_requests',
          filter: `hotel_id=eq.${profile.hotel_id}`,
        },
        async (payload) => {
          const { requests: raw } = await getStaffServiceRequestsAction()
          const mapped = raw as StaffServiceRequest[]
          const incoming = new Set(mapped.map((r) => r.id).filter((id) => !seenIdsRef.current.has(id)))
          mapped.forEach((r) => seenIdsRef.current.add(r.id))
          setRequests(mapped)
          if (incoming.size > 0) {
            setNewIds(incoming)
            setTimeout(() => setNewIds(new Set()), 600)
          }

          const incomingPayload = payload.new as { priority: string; type: string }
          if (incomingPayload.priority === 'urgent') {
            showToast(`🚨 Urgent request — needs ${incomingPayload.type}`)
            try { new Audio('/notification.mp3').play().catch(() => {}) } catch { /* no audio */ }
          } else {
            showToast(`New ${incomingPayload.type} request received`)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'service_requests',
          filter: `hotel_id=eq.${profile.hotel_id}`,
        },
        (payload) => {
          const updated = payload.new as { id: string; status: RequestStatus }
          setRequests((prev) =>
            prev.map((r) => (r.id === updated.id ? { ...r, status: updated.status } : r))
          )
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile?.hotel_id])

  // Polling fallback — 2s interval, animates new cards with msg-rise
  useEffect(() => {
    if (!profile?.hotel_id) return
    let mounted = true
    const interval = setInterval(async () => {
      const { requests: raw } = await getStaffServiceRequestsAction()
      if (!mounted) return
      const mapped = raw as StaffServiceRequest[]
      const incoming = new Set(mapped.map((r) => r.id).filter((id) => !seenIdsRef.current.has(id)))
      mapped.forEach((r) => seenIdsRef.current.add(r.id))
      setRequests(mapped)
      if (incoming.size > 0) {
        setNewIds(incoming)
        setTimeout(() => { if (mounted) setNewIds(new Set()) }, 600)
      }
    }, 2000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [profile?.hotel_id])

  function handleStatusChange(id: string, status: RequestStatus) {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
  }

  const filtered = requests.filter((r) =>
    matchesFilters(r, statusFilter, typeFilter, priorityFilter)
  )

  const pendingCount = requests.filter((r) => r.status === 'pending').length
  const inProgressCount = requests.filter((r) => r.status === 'in_progress').length
  const urgentCount = requests.filter(
    (r) => r.priority === 'urgent' && (r.status === 'pending' || r.status === 'in_progress')
  ).length

  return (
    <div className="min-h-screen" style={{ background: '#F8F0E8' }}>
      {/* Toast notifications */}
      <div className="pointer-events-none fixed top-4 right-4 z-100 flex flex-col gap-2 max-w-xs">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="rounded-2xl px-4 py-3 text-sm font-semibold shadow-lg"
            style={{ background: '#1B2D5B', color: '#F8F0E8' }}
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* Page header */}
      <div
        className="sticky top-0 z-20 border-b px-6 py-5"
        style={{ background: '#F8F0E8', borderColor: 'rgba(27,45,91,0.08)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#C9A84C' }}>
              Operations
            </p>
            <h1 className="font-heading text-2xl font-bold" style={{ color: '#1B2D5B' }}>
              Service Requests
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {urgentCount > 0 && (
              <div
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
                style={{ background: 'rgba(239,68,68,0.10)' }}
              >
                <Bell className="size-3.5" style={{ color: '#DC2626' }} />
                <span className="text-xs font-semibold" style={{ color: '#DC2626' }}>
                  {urgentCount} urgent
                </span>
              </div>
            )}
            <div
              className="flex items-center gap-2 rounded-full px-3 py-1.5"
              style={{ background: 'rgba(34,197,94,0.10)' }}
            >
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-green-500" />
              </span>
              <span className="text-xs font-semibold" style={{ color: '#166534' }}>Live</span>
            </div>
          </div>
        </div>

        {/* Summary pills */}
        {!loading && (pendingCount > 0 || inProgressCount > 0) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {pendingCount > 0 && <CountPill status="pending" count={pendingCount} />}
            {inProgressCount > 0 && <CountPill status="in_progress" count={inProgressCount} />}
          </div>
        )}

        {/* Status filter tabs */}
        <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {STATUS_TABS.map((tab) => {
            const count = tab.key === 'pending' ? pendingCount : tab.key === 'in_progress' ? inProgressCount : 0
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className="shrink-0 cursor-pointer rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-150 hover:opacity-90"
                style={
                  statusFilter === tab.key
                    ? { background: '#1B2D5B', color: '#F8F0E8' }
                    : { background: 'rgba(27,45,91,0.07)', color: '#1B2D5B' }
                }
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className="ml-1.5 rounded-full px-1.5 py-0.5 text-[10px]"
                    style={{ background: '#C9A84C', color: '#FFFFFF' }}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Type + Priority filter row */}
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <div className="flex gap-1">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setTypeFilter(f.key)}
                className="shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all duration-150"
                style={
                  typeFilter === f.key
                    ? { background: '#C9A84C', color: '#FFFFFF' }
                    : { background: 'rgba(27,45,91,0.05)', color: '#7A8BA8' }
                }
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="mx-1 h-6 w-px self-center" style={{ background: 'rgba(27,45,91,0.12)' }} />

          {(['all', 'urgent', 'normal'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className="shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all duration-150"
              style={
                priorityFilter === p
                  ? p === 'urgent'
                    ? { background: '#FEF2F2', color: '#991B1B' }
                    : { background: 'rgba(27,45,91,0.07)', color: '#1B2D5B' }
                  : { background: 'rgba(27,45,91,0.05)', color: '#7A8BA8' }
              }
            >
              {p === 'all' ? 'All Priority' : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-2xl bg-white"
                style={{ boxShadow: '0 2px 16px rgba(27,45,91,0.08)' }}
              >
                <div className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="size-10 animate-pulse rounded-xl" style={{ background: '#EEE4D8' }} />
                      <div className="space-y-1.5">
                        <div className="h-4 w-24 animate-pulse rounded-lg" style={{ background: '#EEE4D8' }} />
                        <div className="h-3 w-32 animate-pulse rounded-lg" style={{ background: '#EEE4D8' }} />
                      </div>
                    </div>
                    <div className="h-6 w-20 animate-pulse rounded-full" style={{ background: '#EEE4D8' }} />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <div className="h-9 flex-1 animate-pulse rounded-xl" style={{ background: '#EEE4D8' }} />
                    <div className="h-9 w-20 animate-pulse rounded-xl" style={{ background: '#EEE4D8' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div
              className="mb-4 flex size-16 items-center justify-center rounded-2xl"
              style={{ background: 'rgba(27,45,91,0.06)' }}
            >
              <ClipboardList className="size-8" style={{ color: '#7A8BA8' }} />
            </div>
            <p className="font-heading text-lg font-semibold" style={{ color: '#1B2D5B' }}>
              No requests here
            </p>
            <p className="mt-1 text-sm" style={{ color: '#7A8BA8' }}>
              {statusFilter === 'pending' ? 'All caught up!' : 'Nothing to show for this filter.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((req) => (
              <div key={req.id} className={newIds.has(req.id) ? 'msg-rise' : undefined}>
                <StaffRequestCard
                  request={req}
                  onStatusChange={handleStatusChange}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
