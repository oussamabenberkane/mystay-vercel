'use client'

import { useState } from 'react'
import { CalendarDays, Eye, EyeOff, Megaphone, Plus, Trash2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  createAnnouncementAction,
  deleteAnnouncementAction,
  toggleAnnouncementAction,
} from '@/lib/actions/announcements'

type Announcement = {
  id: string
  hotel_id: string
  title: string
  body: string
  category: string
  event_date: string | null
  is_active: boolean
  created_at: string
}

const CATEGORY_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  event: { bg: '#FEF3C7', color: '#92400E', label: 'Événement' },
  promo: { bg: '#D1FAE5', color: '#065F46', label: 'Promo' },
  info:  { bg: '#DBEAFE', color: '#1E40AF', label: 'Info' },
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

type ToastMsg = { id: number; message: string; isError: boolean }

interface AnnouncementsClientProps {
  initialAnnouncements: Announcement[]
}

export function AnnouncementsClient({ initialAnnouncements }: AnnouncementsClientProps) {
  const [items, setItems] = useState<Announcement[]>(initialAnnouncements)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [toasts, setToasts] = useState<ToastMsg[]>([])

  // Form state
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState<'event' | 'promo' | 'info'>('info')
  const [eventDate, setEventDate] = useState('')

  function showToast(message: string, isError = false) {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, isError }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }

  function resetForm() {
    setTitle('')
    setBody('')
    setCategory('info')
    setEventDate('')
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return
    setSubmitting(true)

    const result = await createAnnouncementAction({
      title: title.trim(),
      body: body.trim(),
      category,
      event_date: eventDate || null,
    })

    if (result.error) {
      showToast(result.error, true)
    } else if (result.announcement) {
      setItems((prev) => [result.announcement!, ...prev])
      showToast('Annonce publiée avec succès.')
      setSheetOpen(false)
      resetForm()
    }
    setSubmitting(false)
  }

  async function handleToggle(item: Announcement) {
    const result = await toggleAnnouncementAction(item.id, !item.is_active)
    if (result.error) {
      showToast(result.error, true)
    } else {
      setItems((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, is_active: !a.is_active } : a))
      )
    }
  }

  async function handleDelete(id: string) {
    const result = await deleteAnnouncementAction(id)
    if (result.error) {
      showToast(result.error, true)
    } else {
      setItems((prev) => prev.filter((a) => a.id !== id))
      showToast('Annonce supprimée.')
    }
    setDeleteTarget(null)
  }

  const CATEGORIES: Array<{ value: 'event' | 'promo' | 'info'; label: string }> = [
    { value: 'event', label: 'Événement' },
    { value: 'promo', label: 'Promo' },
    { value: 'info', label: 'Info' },
  ]

  return (
    <>
      {/* Toasts */}
      <div className="pointer-events-none fixed top-4 left-4 right-4 z-[100] flex flex-col gap-2">
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

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: '#7A8BA8' }}>
          {items.length} annonce{items.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={() => setSheetOpen(true)}
          className="flex cursor-pointer items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.97]"
          style={{ background: '#1B2D5B', color: '#F8F0E8' }}
        >
          <Plus className="size-4" style={{ color: '#C9A84C' }} />
          Nouvelle annonce
        </button>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-2xl py-16"
          style={{ background: 'rgba(255,255,255,0.7)' }}
        >
          <Megaphone className="size-10 mb-3" style={{ color: '#C9A84C', opacity: 0.4 }} />
          <p className="text-sm" style={{ color: '#7A8BA8' }}>
            Aucune annonce pour le moment
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const style = CATEGORY_STYLES[item.category] ?? CATEGORY_STYLES.info
            return (
              <div
                key={item.id}
                className="overflow-hidden rounded-2xl bg-white"
                style={{
                  boxShadow: '0 2px 16px rgba(27,45,91,0.08)',
                  opacity: item.is_active ? 1 : 0.55,
                }}
              >
                <div className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest"
                          style={{ background: style.bg, color: style.color }}
                        >
                          {style.label}
                        </span>
                        {!item.is_active && (
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                            style={{ background: 'rgba(27,45,91,0.06)', color: '#7A8BA8' }}
                          >
                            Masqué
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-sm leading-snug" style={{ color: '#1B2D5B' }}>
                        {item.title}
                      </p>
                      <p
                        className="mt-1 line-clamp-2 text-xs leading-relaxed"
                        style={{ color: '#7A8BA8' }}
                      >
                        {item.body}
                      </p>
                      {item.event_date && (
                        <div className="mt-2 flex items-center gap-1" style={{ color: '#C9A84C' }}>
                          <CalendarDays className="size-3.5" />
                          <span className="text-xs font-medium">{formatDate(item.event_date)}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => handleToggle(item)}
                        className="flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-black/5"
                        style={{ color: item.is_active ? '#16a34a' : '#7A8BA8' }}
                        title={item.is_active ? 'Masquer' : 'Afficher'}
                      >
                        {item.is_active ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                      </button>
                      <button
                        onClick={() => setDeleteTarget(item.id)}
                        className="flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-red-50"
                        style={{ color: '#C0392B' }}
                        title="Supprimer"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(27,45,91,0.4)' }}>
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6"
            style={{ boxShadow: '0 8px 40px rgba(27,45,91,0.14)' }}
          >
            <p className="font-heading text-lg font-bold mb-2" style={{ color: '#1B2D5B' }}>
              Supprimer l&apos;annonce ?
            </p>
            <p className="text-sm mb-6" style={{ color: '#7A8BA8' }}>
              Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 cursor-pointer rounded-xl border py-2.5 text-sm font-semibold transition-colors hover:bg-gray-50"
                style={{ borderColor: 'rgba(27,45,91,0.12)', color: '#7A8BA8' }}
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(deleteTarget)}
                className="flex-1 cursor-pointer rounded-xl py-2.5 text-sm font-semibold transition-colors hover:opacity-90"
                style={{ background: '#C0392B', color: '#FFF' }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Announcement Sheet */}
      <Sheet open={sheetOpen} onOpenChange={(o) => { setSheetOpen(o); if (!o) resetForm() }}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="gap-0 rounded-t-3xl bg-white p-0 max-h-[90vh] overflow-y-auto"
        >
          <div className="flex justify-center pb-2 pt-3">
            <div className="h-1 w-10 rounded-full" style={{ background: '#EEE4D8' }} />
          </div>

          <SheetHeader className="px-6 pb-2 pt-1">
            <p
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: '#C9A84C' }}
            >
              Communication
            </p>
            <SheetTitle className="font-heading text-xl font-bold" style={{ color: '#1B2D5B' }}>
              Nouvelle annonce
            </SheetTitle>
          </SheetHeader>

          <form onSubmit={handleCreate} className="px-6 pb-8 space-y-5">
            {/* Title */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: '#7A8BA8' }}>
                Titre
              </p>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Ex: Soirée thématique vendredi…"
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-2"
                style={{
                  borderColor: 'rgba(27,45,91,0.15)',
                  color: '#1B2D5B',
                  // @ts-expect-error CSS variable
                  '--tw-ring-color': '#C9A84C',
                }}
              />
            </div>

            {/* Body */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: '#7A8BA8' }}>
                Contenu
              </p>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                rows={4}
                placeholder="Détails de l'annonce…"
                className="w-full resize-none rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-2"
                style={{
                  borderColor: 'rgba(27,45,91,0.15)',
                  color: '#1B2D5B',
                  // @ts-expect-error CSS variable
                  '--tw-ring-color': '#C9A84C',
                }}
              />
            </div>

            {/* Category */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: '#7A8BA8' }}>
                Catégorie
              </p>
              <div className="flex gap-3">
                {CATEGORIES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setCategory(value)}
                    className="flex flex-1 cursor-pointer items-center justify-center rounded-xl border-2 py-3 text-sm font-semibold transition-all duration-150"
                    style={
                      category === value
                        ? { background: '#EFF6FF', borderColor: '#1B2D5B', color: '#1B2D5B' }
                        : { background: 'transparent', borderColor: 'rgba(27,45,91,0.12)', color: '#7A8BA8' }
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Event date */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: '#7A8BA8' }}>
                Date de l&apos;événement <span className="normal-case font-normal">(optionnel)</span>
              </p>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-2"
                style={{
                  borderColor: 'rgba(27,45,91,0.15)',
                  color: '#1B2D5B',
                  // @ts-expect-error CSS variable
                  '--tw-ring-color': '#C9A84C',
                }}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !title.trim() || !body.trim()}
              className="w-full cursor-pointer rounded-2xl py-4 text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: '#1B2D5B', color: '#F8F0E8', minHeight: '52px' }}
            >
              {submitting ? 'Publication…' : 'Publier l\'annonce'}
            </button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}
