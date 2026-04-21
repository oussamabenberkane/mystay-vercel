'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Search, Plus, Archive } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import { createStayAction, archiveStayAction } from '@/lib/actions/admin-stays'

type Stay = {
  id: string
  status: 'active' | 'archived'
  check_in: string
  check_out: string
  created_at: string
  rooms: { number: string; type: string } | null
  profiles: { full_name: string; email: string | null } | null
}

type Guest = { id: string; full_name: string; email: string | null }
type Room = { id: string; number: string; type: string; floor: number | null }

const newStaySchema = z.object({
  guestId: z.string().min(1, 'Please select a guest'),
  roomId: z.string().min(1, 'Please select a room'),
  checkIn: z.string().min(1, 'Check-in date required'),
  checkOut: z.string().min(1, 'Check-out date required'),
})

type NewStayForm = z.infer<typeof newStaySchema>

function StatusBadge({ status }: { status: 'active' | 'archived' }) {
  return (
    <span
      className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold"
      style={
        status === 'active'
          ? { background: 'rgba(22,163,74,0.10)', color: '#15803d' }
          : { background: 'rgba(27,45,91,0.07)', color: '#7A8BA8' }
      }
    >
      {status === 'active' ? 'Active' : 'Archived'}
    </span>
  )
}

interface StaysClientProps {
  stays: Stay[]
  guests: Guest[]
  rooms: Room[]
}

export function StaysClient({ stays, guests, rooms }: StaysClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all')
  const [newOpen, setNewOpen] = useState(false)
  const [archiveTarget, setArchiveTarget] = useState<Stay | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewStayForm>({
    resolver: zodResolver(newStaySchema),
  })

  const filtered = stays.filter((s) => {
    const guestName = s.profiles?.full_name ?? ''
    const roomNum = s.rooms?.number ?? ''
    const matchSearch =
      guestName.toLowerCase().includes(search.toLowerCase()) ||
      roomNum.includes(search)
    const matchStatus = statusFilter === 'all' || s.status === statusFilter
    return matchSearch && matchStatus
  })

  async function onNewStay(data: NewStayForm) {
    setActionError(null)
    const result = await createStayAction(data)
    if (result.error) {
      setActionError(result.error)
    } else {
      reset()
      setNewOpen(false)
      router.refresh()
    }
  }

  function handleArchive() {
    if (!archiveTarget) return
    startTransition(async () => {
      const result = await archiveStayAction(archiveTarget.id)
      setArchiveTarget(null)
      if (result.error) setActionError(result.error)
      else router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4" style={{ color: '#7A8BA8' }} />
          <Input
            placeholder="Search by guest or room…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl"
            style={{ borderColor: 'rgba(27,45,91,0.12)' }}
          />
        </div>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter((v ?? 'all') as typeof statusFilter)}>
          <SelectTrigger className="w-36 rounded-xl" style={{ borderColor: 'rgba(27,45,91,0.12)' }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stays</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>

        <Button
          onClick={() => setNewOpen(true)}
          className="flex items-center gap-2 rounded-xl"
          style={{ background: '#1B2D5B', color: '#F8F0E8' }}
        >
          <Plus className="size-4" />
          New Stay
        </Button>
      </div>

      {actionError && (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(192,57,43,0.08)', color: '#C0392B' }}>
          {actionError}
          <button className="ml-2 cursor-pointer underline hover:no-underline" onClick={() => setActionError(null)}>Dismiss</button>
        </div>
      )}

      {/* Table */}
      <div className="card-warm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'rgba(248,240,232,0.5)', borderBottom: '1px solid rgba(27,45,91,0.06)' }}>
                {['Guest', 'Room', 'Check-in', 'Check-out', 'Status', ''].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: '#7A8BA8' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm" style={{ color: '#7A8BA8' }}>
                    No stays found
                  </td>
                </tr>
              ) : (
                filtered.map((stay) => (
                  <tr
                    key={stay.id}
                    className="transition-colors"
                    style={{ borderBottom: '1px solid rgba(27,45,91,0.04)' }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(248,240,232,0.5)')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = '')}
                  >
                    <td className="px-5 py-3.5 font-medium" style={{ color: '#1B2D5B' }}>
                      {stay.profiles?.full_name ?? '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-medium" style={{ color: '#1B2D5B' }}>
                        {stay.rooms?.number ?? '—'}
                      </span>
                      {stay.rooms?.type && (
                        <span className="ml-1.5 text-xs" style={{ color: '#7A8BA8' }}>
                          {stay.rooms.type}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5" style={{ color: '#7A8BA8' }}>
                      {new Date(stay.check_in).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5" style={{ color: '#7A8BA8' }}>
                      {new Date(stay.check_out).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={stay.status} />
                    </td>
                    <td className="px-5 py-3.5">
                      {stay.status === 'active' && (
                        <button
                          onClick={() => setArchiveTarget(stay)}
                          className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:bg-black/5"
                          style={{ color: '#7A8BA8' }}
                        >
                          <Archive className="size-3.5" />
                          Archive
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Stay Dialog */}
      <Dialog open={newOpen} onOpenChange={(o) => { setNewOpen(o); if (!o) { reset(); setActionError(null) } }}>
        <DialogContent
          className="sm:max-w-md"
          style={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 8px 40px rgba(27,45,91,0.14)' }}
        >
          <DialogHeader>
            <DialogTitle className="font-heading text-xl" style={{ color: '#1B2D5B' }}>
              New Stay
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onNewStay)} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#7A8BA8' }}>
                Guest
              </Label>
              <Select value={watch('guestId') ?? ''} onValueChange={(v) => setValue('guestId', v ?? '')}>
                <SelectTrigger className="rounded-xl" style={{ borderColor: 'rgba(27,45,91,0.12)' }}>
                  <SelectValue placeholder="Select guest…" />
                </SelectTrigger>
                <SelectContent>
                  {guests.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.full_name} {g.email ? `(${g.email})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.guestId && <p className="text-xs text-red-500">{errors.guestId.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#7A8BA8' }}>
                Room
              </Label>
              <Select value={watch('roomId') ?? ''} onValueChange={(v) => setValue('roomId', v ?? '')}>
                <SelectTrigger className="rounded-xl" style={{ borderColor: 'rgba(27,45,91,0.12)' }}>
                  <SelectValue placeholder="Select room…" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      Room {r.number} — {r.type}{r.floor ? ` · Floor ${r.floor}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.roomId && <p className="text-xs text-red-500">{errors.roomId.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#7A8BA8' }}>
                  Check-in
                </Label>
                <Input
                  {...register('checkIn')}
                  type="date"
                  className="rounded-xl"
                  style={{ borderColor: 'rgba(27,45,91,0.12)' }}
                />
                {errors.checkIn && <p className="text-xs text-red-500">{errors.checkIn.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#7A8BA8' }}>
                  Check-out
                </Label>
                <Input
                  {...register('checkOut')}
                  type="date"
                  className="rounded-xl"
                  style={{ borderColor: 'rgba(27,45,91,0.12)' }}
                />
                {errors.checkOut && <p className="text-xs text-red-500">{errors.checkOut.message}</p>}
              </div>
            </div>

            {actionError && (
              <p className="text-sm rounded-xl px-3 py-2" style={{ background: 'rgba(192,57,43,0.08)', color: '#C0392B' }}>
                {actionError}
              </p>
            )}

            <DialogFooter className="mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewOpen(false)}
                className="rounded-xl"
                style={{ borderColor: 'rgba(27,45,91,0.12)', color: '#7A8BA8' }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl"
                style={{ background: '#1B2D5B', color: '#F8F0E8' }}
              >
                {isSubmitting ? 'Creating…' : 'Create Stay'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Archive confirm */}
      <ConfirmDialog
        open={!!archiveTarget}
        onOpenChange={(o) => !o && setArchiveTarget(null)}
        title="Archive Stay"
        description={`Archive the stay for ${archiveTarget?.profiles?.full_name ?? 'this guest'}? The guest will no longer have an active stay.`}
        confirmLabel="Archive"
        onConfirm={handleArchive}
        isLoading={isPending}
        variant="destructive"
      />
    </div>
  )
}
