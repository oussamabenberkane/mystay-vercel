'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Eye, EyeOff, Gift, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  createLoyaltyOfferAction,
  updateLoyaltyOfferAction,
  toggleLoyaltyOfferAction,
  deleteLoyaltyOfferAction,
  type LoyaltyOffer,
} from '@/lib/actions/loyalty'

type ToastMsg = { id: number; message: string; isError: boolean }

interface LoyaltyAdminClientProps {
  initialOffers: LoyaltyOffer[]
}

export function LoyaltyAdminClient({ initialOffers }: LoyaltyAdminClientProps) {
  const t = useTranslations('adminLoyalty')
  const [items, setItems] = useState<LoyaltyOffer[]>(initialOffers)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<LoyaltyOffer | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [toasts, setToasts] = useState<ToastMsg[]>([])

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [pointsCost, setPointsCost] = useState('')

  function showToast(message: string, isError = false) {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, isError }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }

  function resetForm() {
    setTitle('')
    setDescription('')
    setPointsCost('')
    setEditing(null)
  }

  function openCreate() {
    resetForm()
    setSheetOpen(true)
  }

  function openEdit(offer: LoyaltyOffer) {
    setEditing(offer)
    setTitle(offer.title)
    setDescription(offer.description ?? '')
    setPointsCost(String(offer.points_cost))
    setSheetOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cost = parseInt(pointsCost, 10)
    if (!title.trim() || !Number.isFinite(cost) || cost < 0) return
    setSubmitting(true)

    if (editing) {
      const result = await updateLoyaltyOfferAction(editing.id, {
        title: title.trim(),
        description: description.trim() || null,
        points_cost: cost,
      })
      if (result.error) {
        showToast(result.error, true)
      } else if (result.offer) {
        setItems((prev) => prev.map((o) => (o.id === editing.id ? result.offer! : o)))
        showToast(t('offerUpdated'))
        setSheetOpen(false)
        resetForm()
      }
    } else {
      const result = await createLoyaltyOfferAction({
        title: title.trim(),
        description: description.trim() || null,
        points_cost: cost,
      })
      if (result.error) {
        showToast(result.error, true)
      } else if (result.offer) {
        setItems((prev) => [result.offer!, ...prev])
        showToast(t('offerCreated'))
        setSheetOpen(false)
        resetForm()
      }
    }
    setSubmitting(false)
  }

  async function handleToggle(item: LoyaltyOffer) {
    const result = await toggleLoyaltyOfferAction(item.id, !item.is_active)
    if (result.error) {
      showToast(result.error, true)
    } else {
      setItems((prev) =>
        prev.map((o) => (o.id === item.id ? { ...o, is_active: !o.is_active } : o))
      )
    }
  }

  async function handleDelete(id: string) {
    const result = await deleteLoyaltyOfferAction(id)
    if (result.error) {
      showToast(result.error, true)
    } else {
      setItems((prev) => prev.filter((o) => o.id !== id))
      showToast(t('offerDeleted'))
    }
    setDeleteTarget(null)
  }

  const costValid = (() => {
    const c = parseInt(pointsCost, 10)
    return Number.isFinite(c) && c >= 0
  })()

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
          {t('count', { count: items.length })}
        </p>
        <button
          onClick={openCreate}
          className="flex cursor-pointer items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.97]"
          style={{ background: '#1B2D5B', color: '#F8F0E8' }}
        >
          <Plus className="size-4" style={{ color: '#C9A84C' }} />
          {t('add')}
        </button>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-2xl py-16"
          style={{ background: 'rgba(255,255,255,0.7)' }}
        >
          <Gift className="size-10 mb-3" style={{ color: '#C9A84C', opacity: 0.4 }} />
          <p className="text-sm" style={{ color: '#7A8BA8' }}>
            {t('empty')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
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
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest"
                        style={{ background: 'rgba(201,168,76,0.14)', color: '#1B2D5B' }}
                      >
                        <Sparkles className="size-3" style={{ color: '#C9A84C' }} />
                        {item.points_cost.toLocaleString()} pts
                      </span>
                      {!item.is_active && (
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                          style={{ background: 'rgba(27,45,91,0.06)', color: '#7A8BA8' }}
                        >
                          {t('hidden')}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-sm leading-snug" style={{ color: '#1B2D5B' }}>
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed" style={{ color: '#7A8BA8' }}>
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => openEdit(item)}
                      className="flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-black/5"
                      style={{ color: '#1B2D5B' }}
                      title={t('edit')}
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      onClick={() => handleToggle(item)}
                      className="flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-black/5"
                      style={{ color: item.is_active ? '#16a34a' : '#7A8BA8' }}
                      title={item.is_active ? t('hide') : t('show')}
                    >
                      {item.is_active ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                    </button>
                    <button
                      onClick={() => setDeleteTarget(item.id)}
                      className="flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-red-50"
                      style={{ color: '#C0392B' }}
                      title={t('delete')}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
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
              {t('deleteTitle')}
            </p>
            <p className="text-sm mb-6" style={{ color: '#7A8BA8' }}>
              {t('irreversible')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 cursor-pointer rounded-xl border py-2.5 text-sm font-semibold transition-colors hover:bg-gray-50"
                style={{ borderColor: 'rgba(27,45,91,0.12)', color: '#7A8BA8' }}
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => handleDelete(deleteTarget)}
                className="flex-1 cursor-pointer rounded-xl py-2.5 text-sm font-semibold transition-colors hover:opacity-90"
                style={{ background: '#C0392B', color: '#FFF' }}
              >
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Sheet */}
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
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#C9A84C' }}>
              {t('eyebrow')}
            </p>
            <SheetTitle className="font-heading text-xl font-bold" style={{ color: '#1B2D5B' }}>
              {editing ? t('editTitle') : t('add')}
            </SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="px-6 pb-8 space-y-5">
            {/* Title */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: '#7A8BA8' }}>
                {t('fieldTitle')}
              </p>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder={t('titlePlaceholder')}
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-2"
                style={{
                  borderColor: 'rgba(27,45,91,0.15)',
                  color: '#1B2D5B',
                  // @ts-expect-error CSS variable
                  '--tw-ring-color': '#C9A84C',
                }}
              />
            </div>

            {/* Description */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: '#7A8BA8' }}>
                {t('fieldDescription')} <span className="normal-case font-normal">{t('optional')}</span>
              </p>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder={t('descriptionPlaceholder')}
                className="w-full resize-none rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-2"
                style={{
                  borderColor: 'rgba(27,45,91,0.15)',
                  color: '#1B2D5B',
                  // @ts-expect-error CSS variable
                  '--tw-ring-color': '#C9A84C',
                }}
              />
            </div>

            {/* Points cost */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: '#7A8BA8' }}>
                {t('fieldPointsCost')}
              </p>
              <input
                type="number"
                min={0}
                step={1}
                value={pointsCost}
                onChange={(e) => setPointsCost(e.target.value)}
                required
                placeholder={t('pointsPlaceholder')}
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
              disabled={submitting || !title.trim() || !costValid}
              className="w-full cursor-pointer rounded-2xl py-4 text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: '#1B2D5B', color: '#F8F0E8', minHeight: '52px' }}
            >
              {submitting ? t('saving') : editing ? t('save') : t('create')}
            </button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}
