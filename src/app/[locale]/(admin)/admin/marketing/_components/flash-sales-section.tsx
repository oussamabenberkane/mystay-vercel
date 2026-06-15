'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Tag, Trash2 } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  createFlashSaleAction,
  deleteFlashSaleAction,
  reorderFlashSaleAction,
  toggleFlashSaleAction,
  updateFlashSaleAction,
  type FlashSale,
} from '@/lib/actions/admin-promos'
import {
  AddButton,
  DeleteConfirm,
  FieldLabel,
  SubmitButton,
  TextArea,
  TextField,
  ToastViewport,
  useToasts,
} from './ui'

function sortSales(list: FlashSale[]): FlashSale[] {
  return [...list].sort((a, b) =>
    a.sort_order !== b.sort_order
      ? a.sort_order - b.sort_order
      : a.created_at < b.created_at
        ? 1
        : -1
  )
}

// Convert an ISO timestamp -> value for <input type="datetime-local"> (local time, no tz).
function isoToLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Convert datetime-local value -> ISO string (or null).
function localInputToIso(value: string): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

function formatRange(starts: string | null, ends: string | null): string | null {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  if (starts && ends) return `${fmt(starts)} → ${fmt(ends)}`
  if (ends) return `→ ${fmt(ends)}`
  if (starts) return `${fmt(starts)} →`
  return null
}

export function FlashSalesSection({ initial }: { initial: FlashSale[] }) {
  const t = useTranslations('adminPromos')
  const { toasts, showToast } = useToasts()

  const [items, setItems] = useState<FlashSale[]>(sortSales(initial))
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<FlashSale | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [discountLabel, setDiscountLabel] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [sortOrder, setSortOrder] = useState('0')
  const [isGlobal, setIsGlobal] = useState(false)

  function openCreate() {
    setEditing(null)
    setTitle('')
    setDescription('')
    setImageUrl('')
    setDiscountLabel('')
    setStartsAt('')
    setEndsAt('')
    setSortOrder('0')
    setIsGlobal(false)
    setSheetOpen(true)
  }

  function openEdit(item: FlashSale) {
    setEditing(item)
    setTitle(item.title)
    setDescription(item.description ?? '')
    setImageUrl(item.image_url ?? '')
    setDiscountLabel(item.discount_label ?? '')
    setStartsAt(isoToLocalInput(item.starts_at))
    setEndsAt(isoToLocalInput(item.ends_at))
    setSortOrder(String(item.sort_order))
    setIsGlobal(item.hotel_id === null)
    setSheetOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSubmitting(true)

    const common = {
      title: title.trim(),
      description: description.trim() || null,
      image_url: imageUrl.trim() || null,
      discount_label: discountLabel.trim() || null,
      starts_at: localInputToIso(startsAt),
      ends_at: localInputToIso(endsAt),
      sort_order: Number(sortOrder) || 0,
    }

    if (editing) {
      const result = await updateFlashSaleAction(editing.id, common)
      if (result.error) {
        showToast(result.error, true)
      } else if (result.sale) {
        setItems((prev) => sortSales(prev.map((s) => (s.id === editing.id ? result.sale! : s))))
        showToast(t('toast.saleUpdated'))
        setSheetOpen(false)
      }
    } else {
      const result = await createFlashSaleAction({ ...common, is_global: isGlobal })
      if (result.error) {
        showToast(result.error, true)
      } else if (result.sale) {
        setItems((prev) => sortSales([result.sale!, ...prev]))
        showToast(t('toast.saleCreated'))
        setSheetOpen(false)
      }
    }
    setSubmitting(false)
  }

  async function handleToggle(item: FlashSale) {
    const result = await toggleFlashSaleAction(item.id, !item.is_active)
    if (result.error) showToast(result.error, true)
    else setItems((prev) => prev.map((s) => (s.id === item.id ? { ...s, is_active: !s.is_active } : s)))
  }

  async function handleDelete(id: string) {
    const result = await deleteFlashSaleAction(id)
    if (result.error) showToast(result.error, true)
    else {
      setItems((prev) => prev.filter((s) => s.id !== id))
      showToast(t('toast.saleDeleted'))
    }
    setDeleteTarget(null)
  }

  async function handleReorder(item: FlashSale, dir: -1 | 1) {
    const next = item.sort_order + dir
    const result = await reorderFlashSaleAction(item.id, next)
    if (result.error) showToast(result.error, true)
    else setItems((prev) => sortSales(prev.map((s) => (s.id === item.id ? { ...s, sort_order: next } : s))))
  }

  return (
    <>
      <ToastViewport toasts={toasts} />

      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: '#7A8BA8' }}>
          {t('flashSales.count', { count: items.length })}
        </p>
        <AddButton label={t('flashSales.add')} onClick={openCreate} />
      </div>

      {items.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-2xl py-16"
          style={{ background: 'rgba(255,255,255,0.7)' }}
        >
          <Tag className="size-10 mb-3" style={{ color: '#C9A84C', opacity: 0.4 }} />
          <p className="text-sm" style={{ color: '#7A8BA8' }}>
            {t('flashSales.empty')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const range = formatRange(item.starts_at, item.ends_at)
            return (
              <div
                key={item.id}
                className="flex items-stretch gap-4 overflow-hidden rounded-2xl bg-white p-3"
                style={{ boxShadow: '0 2px 16px rgba(27,45,91,0.08)', opacity: item.is_active ? 1 : 0.55 }}
              >
                {item.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="size-20 shrink-0 rounded-xl object-cover"
                    style={{ background: 'rgba(27,45,91,0.06)' }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest"
                      style={
                        item.hotel_id === null
                          ? { background: '#FEF3C7', color: '#92400E' }
                          : { background: '#DBEAFE', color: '#1E40AF' }
                      }
                    >
                      {item.hotel_id === null ? t('scope.global') : t('scope.thisHotel')}
                    </span>
                    {item.discount_label && (
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                        style={{ background: '#D1FAE5', color: '#065F46' }}
                      >
                        {item.discount_label}
                      </span>
                    )}
                    <span className="text-[10px] font-medium" style={{ color: '#7A8BA8' }}>
                      {t('common.order')}: {item.sort_order}
                    </span>
                    {!item.is_active && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{ background: 'rgba(27,45,91,0.06)', color: '#7A8BA8' }}
                      >
                        {t('common.hidden')}
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-sm leading-snug" style={{ color: '#1B2D5B' }}>
                    {item.title}
                  </p>
                  {item.description && (
                    <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed" style={{ color: '#7A8BA8' }}>
                      {item.description}
                    </p>
                  )}
                  {range && (
                    <p className="mt-1 text-xs font-medium" style={{ color: '#C9A84C' }}>
                      {range}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-col items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleReorder(item, -1)}
                      className="flex size-7 items-center justify-center rounded-lg transition-colors hover:bg-black/5"
                      style={{ color: '#7A8BA8' }}
                      title={t('common.moveUp')}
                    >
                      <ArrowUp className="size-4" />
                    </button>
                    <button
                      onClick={() => handleReorder(item, 1)}
                      className="flex size-7 items-center justify-center rounded-lg transition-colors hover:bg-black/5"
                      style={{ color: '#7A8BA8' }}
                      title={t('common.moveDown')}
                    >
                      <ArrowDown className="size-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggle(item)}
                      className="flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-black/5"
                      style={{ color: item.is_active ? '#16a34a' : '#7A8BA8' }}
                      title={item.is_active ? t('common.hide') : t('common.show')}
                    >
                      {item.is_active ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                    </button>
                    <button
                      onClick={() => openEdit(item)}
                      className="flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-black/5"
                      style={{ color: '#1B2D5B' }}
                      title={t('common.edit')}
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(item.id)}
                      className="flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-red-50"
                      style={{ color: '#C0392B' }}
                      title={t('common.delete')}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {deleteTarget && (
        <DeleteConfirm
          title={t('flashSales.deleteTitle')}
          description={t('common.irreversible')}
          cancelLabel={t('common.cancel')}
          confirmLabel={t('common.delete')}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => handleDelete(deleteTarget)}
        />
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
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
              {t('tabs.flashSales')}
            </p>
            <SheetTitle className="font-heading text-xl font-bold" style={{ color: '#1B2D5B' }}>
              {editing ? t('flashSales.editTitle') : t('flashSales.add')}
            </SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="px-6 pb-8 space-y-5">
            <div>
              <FieldLabel>{t('fields.title')}</FieldLabel>
              <TextField value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>

            <div>
              <FieldLabel optional={t('common.optional')}>{t('fields.description')}</FieldLabel>
              <TextArea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>

            <div>
              <FieldLabel optional={t('common.optional')}>{t('fields.imageUrl')}</FieldLabel>
              <TextField value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
            </div>

            <div>
              <FieldLabel optional={t('common.optional')}>{t('fields.discountLabel')}</FieldLabel>
              <TextField value={discountLabel} onChange={(e) => setDiscountLabel(e.target.value)} placeholder="-30%" />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel optional={t('common.optional')}>{t('fields.startsAt')}</FieldLabel>
                <TextField type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
              </div>
              <div>
                <FieldLabel optional={t('common.optional')}>{t('fields.endsAt')}</FieldLabel>
                <TextField type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
              </div>
            </div>

            <div>
              <FieldLabel>{t('fields.sortOrder')}</FieldLabel>
              <TextField type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
            </div>

            {!editing && (
              <div>
                <FieldLabel>{t('fields.scope')}</FieldLabel>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsGlobal(false)}
                    className="flex flex-1 cursor-pointer items-center justify-center rounded-xl border-2 py-3 text-sm font-semibold transition-all duration-150"
                    style={
                      !isGlobal
                        ? { background: '#EFF6FF', borderColor: '#1B2D5B', color: '#1B2D5B' }
                        : { background: 'transparent', borderColor: 'rgba(27,45,91,0.12)', color: '#7A8BA8' }
                    }
                  >
                    {t('scope.thisHotel')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsGlobal(true)}
                    className="flex flex-1 cursor-pointer items-center justify-center rounded-xl border-2 py-3 text-sm font-semibold transition-all duration-150"
                    style={
                      isGlobal
                        ? { background: '#EFF6FF', borderColor: '#1B2D5B', color: '#1B2D5B' }
                        : { background: 'transparent', borderColor: 'rgba(27,45,91,0.12)', color: '#7A8BA8' }
                    }
                  >
                    {t('scope.global')}
                  </button>
                </div>
              </div>
            )}

            <SubmitButton
              label={submitting ? t('common.saving') : editing ? t('common.save') : t('common.create')}
              disabled={submitting || !title.trim()}
            />
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}
