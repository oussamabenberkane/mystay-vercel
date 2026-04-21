'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Bell, Brush, Droplets, Wrench, Ellipsis, AlertTriangle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { RequestStatusBadge } from '@/components/shared/request-status-badge'
import { PriorityBadge } from '@/components/shared/priority-badge'
import { RequestTypeSelector } from '@/components/guest/request-type-selector'
import {
  createServiceRequestAction,
  getServiceRequestsForStayAction,
  type RequestType,
  type RequestPriority,
  type RequestStatus,
} from '@/lib/actions/service-requests'
import { getActiveStayAction } from '@/lib/actions/room-service'
import { createClient } from '@/lib/supabase/client'

const schema = z.object({
  type: z.enum(['cleaning', 'towels', 'maintenance', 'other'] as const),
  priority: z.enum(['normal', 'urgent'] as const),
  description: z.string().max(500).optional(),
})

type FormData = z.infer<typeof schema>

type ServiceRequest = {
  id: string
  type: RequestType
  priority: RequestPriority
  status: RequestStatus
  description: string | null
  created_at: string
  isOptimistic?: boolean
}

const TYPE_ICONS: Record<RequestType, React.ElementType> = {
  cleaning:    Brush,
  towels:      Droplets,
  maintenance: Wrench,
  other:       Ellipsis,
}

// Labels resolved via t() inside components that have translation context

const TYPE_COLORS: Record<RequestType, string> = {
  cleaning:    '#3B82F6',
  towels:      '#06B6D4',
  maintenance: '#F59E0B',
  other:       '#8B5CF6',
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

function RequestSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-2xl bg-white"
      style={{ boxShadow: '0 2px 16px rgba(27,45,91,0.08)' }}
    >
      <div className="h-1 animate-pulse" style={{ background: '#EEE4D8' }} />
      <div className="space-y-3 px-5 py-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 animate-pulse rounded-xl" style={{ background: '#EEE4D8' }} />
            <div className="space-y-1.5">
              <div className="h-4 w-28 animate-pulse rounded-lg" style={{ background: '#EEE4D8' }} />
              <div className="h-3 w-20 animate-pulse rounded-lg" style={{ background: '#EEE4D8' }} />
            </div>
          </div>
          <div className="h-6 w-20 animate-pulse rounded-full" style={{ background: '#EEE4D8' }} />
        </div>
      </div>
    </div>
  )
}

function RequestCard({ request }: { request: ServiceRequest }) {
  const t = useTranslations('guest.requests')
  const Icon = TYPE_ICONS[request.type]
  const color = TYPE_COLORS[request.type]
  const accentBorder = request.priority === 'urgent' ? '#EF4444' : 'rgba(27,45,91,0.12)'

  return (
    <div
      className="overflow-hidden rounded-2xl bg-white"
      style={{
        boxShadow: '0 2px 16px rgba(27,45,91,0.08)',
        borderLeft: `4px solid ${accentBorder}`,
        opacity: request.isOptimistic ? 0.7 : 1,
      }}
    >
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-xl"
              style={{ background: `${color}15` }}
            >
              <Icon className="size-5" style={{ color }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#1B2D5B' }}>
                {t(request.type)}
              </p>
              <div className="mt-0.5 flex items-center gap-2">
                <PriorityBadge priority={request.priority} />
                <span className="text-[11px]" style={{ color: '#7A8BA8' }}>
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

        {request.isOptimistic && (
          <p className="mt-2 text-[11px]" style={{ color: '#7A8BA8' }}>
            Submitting…
          </p>
        )}
      </div>
    </div>
  )
}

type ToastMsg = { id: number; message: string; isError: boolean }

export default function GuestRequestsPage() {
  const t = useTranslations('guest.requests')
  const tStatus = useTranslations('status')
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [stayId, setStayId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [toasts, setToasts] = useState<ToastMsg[]>([])

  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'normal' },
  })

  const selectedType = watch('type')
  const selectedPriority = watch('priority')

  function showToast(message: string, isError = false) {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, isError }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }

  useEffect(() => {
    async function init() {
      const { stay } = await getActiveStayAction()
      if (!stay) {
        setLoading(false)
        return
      }
      setStayId(stay.id)
      const { requests: raw } = await getServiceRequestsForStayAction(stay.id)
      setRequests(raw as ServiceRequest[])
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => {
    if (!stayId) return
    const supabase = createClient()
    const channel = supabase
      .channel(`requests:${stayId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'service_requests',
          filter: `stay_id=eq.${stayId}`,
        },
        (payload) => {
          const incoming = payload.new as ServiceRequest
          setRequests((prev) => {
            if (prev.some((r) => r.id === incoming.id)) return prev
            return [incoming, ...prev]
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'service_requests',
          filter: `stay_id=eq.${stayId}`,
        },
        (payload) => {
          const updated = payload.new as ServiceRequest
          setRequests((prev) =>
            prev.map((r) =>
              r.id === updated.id
                ? { ...r, status: updated.status }
                : r
            )
          )
          if (updated.status === 'in_progress') {
            showToast('Your request is now in progress')
          } else if (updated.status === 'completed') {
            showToast('Your request has been completed!')
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [stayId])

  const onSubmit = useCallback(
    async (data: FormData) => {
      if (!stayId) return
      setSubmitting(true)

      const tempId = `temp-${Date.now()}`
      const optimistic: ServiceRequest = {
        id: tempId,
        type: data.type,
        priority: data.priority,
        status: 'pending',
        description: data.description || null,
        created_at: new Date().toISOString(),
        isOptimistic: true,
      }
      setRequests((prev) => [optimistic, ...prev])
      setSheetOpen(false)
      reset()

      const { requestId, error } = await createServiceRequestAction({
        type: data.type,
        priority: data.priority,
        description: data.description,
        stayId,
      })

      if (error || !requestId) {
        setRequests((prev) => prev.filter((r) => r.id !== tempId))
        showToast('Failed to submit request. Please try again.', true)
      } else {
        setRequests((prev) =>
          prev.map((r) =>
            r.id === tempId ? { ...r, id: requestId, isOptimistic: false } : r
          )
        )
        showToast("Request submitted. We'll be there soon!")
      }

      setSubmitting(false)
    },
    [stayId, reset]
  )

  return (
    <div className="min-h-screen" style={{ background: '#F8F0E8' }}>
      {/* Toast notifications */}
      <div className="pointer-events-none fixed top-4 left-4 right-4 z-100 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="rounded-2xl px-4 py-3 text-sm font-semibold shadow-lg"
            style={{
              background: t.isError ? '#FEF2F2' : '#F0FDF4',
              color: t.isError ? '#991B1B' : '#166534',
            }}
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <div
        className="sticky top-0 z-30 border-b px-4 py-4"
        style={{ background: '#F8F0E8', borderColor: 'rgba(27,45,91,0.08)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: '#C9A84C' }}
            >
              Concierge
            </p>
            <h1
              className="font-heading text-2xl font-bold leading-tight"
              style={{ color: '#1B2D5B' }}
            >
              {t('title')}
            </h1>
          </div>
          <button
            onClick={() => setSheetOpen(true)}
            className="flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all active:scale-[0.97]"
            style={{ background: '#1B2D5B', color: '#F8F0E8' }}
          >
            <Bell className="size-4" style={{ color: '#C9A84C' }} />
            {t('newRequest')}
          </button>
        </div>
      </div>

      <div className="px-4 py-6">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <RequestSkeleton key={i} />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div
              className="mb-5 flex size-20 items-center justify-center rounded-3xl"
              style={{ background: 'rgba(27,45,91,0.06)' }}
            >
              <Bell className="size-9" style={{ color: '#7A8BA8' }} />
            </div>
            <h2 className="font-heading text-xl font-semibold" style={{ color: '#1B2D5B' }}>
              {t('empty')}
            </h2>
            <p className="mt-2 text-center text-sm" style={{ color: '#7A8BA8' }}>
              {/* TODO: i18n */}
              Need something? Tap below to request a service.
            </p>
            <button
              onClick={() => setSheetOpen(true)}
              className="mt-8 rounded-2xl px-8 py-3.5 text-sm font-semibold transition-all active:scale-[0.98]"
              style={{ background: '#1B2D5B', color: '#F8F0E8' }}
            >
              {t('newRequest')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <RequestCard key={req.id} request={req} />
            ))}
          </div>
        )}
      </div>

      {/* New Request Bottom Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="gap-0 rounded-t-3xl bg-white p-0 max-h-[88vh] overflow-y-auto"
        >
          {/* Handle bar */}
          <div className="flex justify-center pb-2 pt-3">
            <div className="h-1 w-10 rounded-full" style={{ background: '#EEE4D8' }} />
          </div>

          <SheetHeader className="px-6 pb-2 pt-1">
            <p
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: '#C9A84C' }}
            >
              Concierge
            </p>
            <SheetTitle className="font-heading text-xl font-bold" style={{ color: '#1B2D5B' }}>
              {t('newRequest')}
            </SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="px-6 pb-8 space-y-6">
            {/* Request Type */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: '#7A8BA8' }}>
                Request Type
              </p>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <RequestTypeSelector
                    value={field.value ?? null}
                    onChange={field.onChange}
                    error={errors.type?.message}
                  />
                )}
              />
            </div>

            {/* Priority */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: '#7A8BA8' }}>
                Priority
              </p>
              <div className="flex gap-3">
                {(['normal', 'urgent'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setValue('priority', p)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-semibold transition-all duration-150"
                    style={
                      selectedPriority === p
                        ? p === 'urgent'
                          ? { background: '#FEF2F2', borderColor: '#EF4444', color: '#991B1B' }
                          : { background: '#EFF6FF', borderColor: '#1B2D5B', color: '#1B2D5B' }
                        : { background: 'transparent', borderColor: 'rgba(27,45,91,0.12)', color: '#7A8BA8' }
                    }
                  >
                    {p === 'urgent' && <AlertTriangle className="size-3.5" />}
                    {tStatus(p)}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: '#7A8BA8' }}>
                Details <span className="normal-case font-normal">(optional)</span>
              </p>
              <textarea
                {...register('description')}
                rows={3}
                placeholder="Add any details..."
                className="w-full resize-none rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-2"
                style={{
                  borderColor: 'rgba(27,45,91,0.15)',
                  color: '#1B2D5B',
                  background: '#FFFFFF',
                  // @ts-expect-error CSS variable
                  '--tw-ring-color': '#C9A84C',
                }}
              />
              {errors.description && (
                <p className="mt-1 text-xs" style={{ color: '#991B1B' }}>
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !selectedType}
              className="w-full rounded-2xl py-4 text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
              style={{ background: '#1B2D5B', color: '#F8F0E8', minHeight: '52px' }}
            >
              {submitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
