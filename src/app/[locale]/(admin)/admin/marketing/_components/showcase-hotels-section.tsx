'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowDown, ArrowUp, Building2, Eye, EyeOff, MapPin, Pencil, Star, Trash2 } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  createShowcaseHotelAction,
  deleteShowcaseHotelAction,
  reorderShowcaseHotelAction,
  toggleShowcaseHotelAction,
  updateShowcaseHotelAction,
  type ShowcaseHotel,
} from '@/lib/actions/admin-promos'
import {
  AddButton,
  DeleteConfirm,
  FieldLabel,
  SubmitButton,
  TextField,
  ToastViewport,
  useToasts,
} from './ui'

function sortHotels(list: ShowcaseHotel[]): ShowcaseHotel[] {
  return [...list].sort((a, b) =>
    a.sort_order !== b.sort_order
      ? a.sort_order - b.sort_order
      : a.created_at < b.created_at
        ? 1
        : -1
  )
}

function parseNum(value: string): number | null {
  if (!value.trim()) return null
  const n = Number(value)
  return Number.isNaN(n) ? null : n
}

export function ShowcaseHotelsSection({ initial }: { initial: ShowcaseHotel[] }) {
  const t = useTranslations('adminPromos')
  const { toasts, showToast } = useToasts()

  const [items, setItems] = useState<ShowcaseHotel[]>(sortHotels(initial))
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<ShowcaseHotel | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [location, setLocation] = useState('')
  const [price, setPrice] = useState('')
  const [rating, setRating] = useState('')
  const [sortOrder, setSortOrder] = useState('0')

  function openCreate() {
    setEditing(null)
    setName('')
    setImageUrl('')
    setLocation('')
    setPrice('')
    setRating('')
    setSortOrder('0')
    setSheetOpen(true)
  }

  function openEdit(item: ShowcaseHotel) {
    setEditing(item)
    setName(item.name)
    setImageUrl(item.image_url ?? '')
    setLocation(item.location ?? '')
    setPrice(item.indicative_price !== null ? String(item.indicative_price) : '')
    setRating(item.rating !== null ? String(item.rating) : '')
    setSortOrder(String(item.sort_order))
    setSheetOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)

    const common = {
      name: name.trim(),
      image_url: imageUrl.trim() || null,
      location: location.trim() || null,
      indicative_price: parseNum(price),
      rating: parseNum(rating),
      sort_order: Number(sortOrder) || 0,
    }

    if (editing) {
      const result = await updateShowcaseHotelAction(editing.id, common)
      if (result.error) {
        showToast(result.error, true)
      } else if (result.hotel) {
        setItems((prev) => sortHotels(prev.map((h) => (h.id === editing.id ? result.hotel! : h))))
        showToast(t('toast.hotelUpdated'))
        setSheetOpen(false)
      }
    } else {
      const result = await createShowcaseHotelAction(common)
      if (result.error) {
        showToast(result.error, true)
      } else if (result.hotel) {
        setItems((prev) => sortHotels([result.hotel!, ...prev]))
        showToast(t('toast.hotelCreated'))
        setSheetOpen(false)
      }
    }
    setSubmitting(false)
  }

  async function handleToggle(item: ShowcaseHotel) {
    const result = await toggleShowcaseHotelAction(item.id, !item.is_active)
    if (result.error) showToast(result.error, true)
    else setItems((prev) => prev.map((h) => (h.id === item.id ? { ...h, is_active: !h.is_active } : h)))
  }

  async function handleDelete(id: string) {
    const result = await deleteShowcaseHotelAction(id)
    if (result.error) showToast(result.error, true)
    else {
      setItems((prev) => prev.filter((h) => h.id !== id))
      showToast(t('toast.hotelDeleted'))
    }
    setDeleteTarget(null)
  }

  async function handleReorder(item: ShowcaseHotel, dir: -1 | 1) {
    const next = item.sort_order + dir
    const result = await reorderShowcaseHotelAction(item.id, next)
    if (result.error) showToast(result.error, true)
    else setItems((prev) => sortHotels(prev.map((h) => (h.id === item.id ? { ...h, sort_order: next } : h))))
  }

  return (
    <>
      <ToastViewport toasts={toasts} />

      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: '#7A8BA8' }}>
          {t('showcaseHotels.count', { count: items.length })}
        </p>
        <AddButton label={t('showcaseHotels.add')} onClick={openCreate} />
      </div>

      {items.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-2xl py-16"
          style={{ background: 'rgba(255,255,255,0.7)' }}
        >
          <Building2 className="size-10 mb-3" style={{ color: '#C9A84C', opacity: 0.4 }} />
          <p className="text-sm" style={{ color: '#7A8BA8' }}>
            {t('showcaseHotels.empty')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-stretch gap-4 overflow-hidden rounded-2xl bg-white p-3"
              style={{ boxShadow: '0 2px 16px rgba(27,45,91,0.08)', opacity: item.is_active ? 1 : 0.55 }}
            >
              {item.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="size-20 shrink-0 rounded-xl object-cover"
                  style={{ background: 'rgba(27,45,91,0.06)' }}
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-[10px] font-medium" style={{ color: '#7A8BA8' }}>
                    {t('common.order')}: {item.sort_order}
                  </span>
                  {item.rating !== null && (
                    <span className="flex items-center gap-0.5 text-[11px] font-semibold" style={{ color: '#C9A84C' }}>
                      <Star className="size-3 fill-current" />
                      {item.rating}
                    </span>
                  )}
                  {!item.is_active && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{ background: 'rgba(27,45,91,0.06)', color: '#7A8BA8' }}
                    >
                      {t('common.hidden')}
                    </span>
                  )}
                </div>
                <p className="font-semibold text-sm leading-snug truncate" style={{ color: '#1B2D5B' }}>
                  {item.name}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs" style={{ color: '#7A8BA8' }}>
                  {item.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3" />
                      {item.location}
                    </span>
                  )}
                  {item.indicative_price !== null && (
                    <span className="font-medium">{item.indicative_price}</span>
                  )}
                </div>
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
          ))}
        </div>
      )}

      {deleteTarget && (
        <DeleteConfirm
          title={t('showcaseHotels.deleteTitle')}
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
              {t('tabs.showcaseHotels')}
            </p>
            <SheetTitle className="font-heading text-xl font-bold" style={{ color: '#1B2D5B' }}>
              {editing ? t('showcaseHotels.editTitle') : t('showcaseHotels.add')}
            </SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="px-6 pb-8 space-y-5">
            <div>
              <FieldLabel>{t('fields.name')}</FieldLabel>
              <TextField value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div>
              <FieldLabel optional={t('common.optional')}>{t('fields.imageUrl')}</FieldLabel>
              <TextField value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
            </div>

            <div>
              <FieldLabel optional={t('common.optional')}>{t('fields.location')}</FieldLabel>
              <TextField value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel optional={t('common.optional')}>{t('fields.indicativePrice')}</FieldLabel>
                <TextField type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
              <div>
                <FieldLabel optional={t('common.optional')}>{t('fields.rating')}</FieldLabel>
                <TextField
                  type="number"
                  step="0.1"
                  min="0"
                  max="9.9"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  placeholder="4.5"
                />
              </div>
            </div>

            <div>
              <FieldLabel>{t('fields.sortOrder')}</FieldLabel>
              <TextField type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
            </div>

            <SubmitButton
              label={submitting ? t('common.saving') : editing ? t('common.save') : t('common.create')}
              disabled={submitting || !name.trim()}
            />
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}
