'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowDown, ArrowUp, Eye, EyeOff, Images, Pencil, Trash2 } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  createAdBannerAction,
  deleteAdBannerAction,
  reorderAdBannerAction,
  toggleAdBannerAction,
  updateAdBannerAction,
  type AdBanner,
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

function sortBanners(list: AdBanner[]): AdBanner[] {
  return [...list].sort((a, b) =>
    a.sort_order !== b.sort_order
      ? a.sort_order - b.sort_order
      : a.created_at < b.created_at
        ? 1
        : -1
  )
}

export function BannersSection({ initial }: { initial: AdBanner[] }) {
  const t = useTranslations('adminPromos')
  const { toasts, showToast } = useToasts()

  const [items, setItems] = useState<AdBanner[]>(sortBanners(initial))
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<AdBanner | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  // Form state
  const [imageUrl, setImageUrl] = useState('')
  const [title, setTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [sortOrder, setSortOrder] = useState('0')
  const [isGlobal, setIsGlobal] = useState(false)

  function openCreate() {
    setEditing(null)
    setImageUrl('')
    setTitle('')
    setLinkUrl('')
    setSortOrder('0')
    setIsGlobal(false)
    setSheetOpen(true)
  }

  function openEdit(item: AdBanner) {
    setEditing(item)
    setImageUrl(item.image_url)
    setTitle(item.title ?? '')
    setLinkUrl(item.link_url ?? '')
    setSortOrder(String(item.sort_order))
    setIsGlobal(item.hotel_id === null)
    setSheetOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!imageUrl.trim()) return
    setSubmitting(true)

    if (editing) {
      const result = await updateAdBannerAction(editing.id, {
        image_url: imageUrl.trim(),
        title: title.trim() || null,
        link_url: linkUrl.trim() || null,
        sort_order: Number(sortOrder) || 0,
      })
      if (result.error) {
        showToast(result.error, true)
      } else if (result.banner) {
        setItems((prev) => sortBanners(prev.map((b) => (b.id === editing.id ? result.banner! : b))))
        showToast(t('toast.bannerUpdated'))
        setSheetOpen(false)
      }
    } else {
      const result = await createAdBannerAction({
        image_url: imageUrl.trim(),
        title: title.trim() || null,
        link_url: linkUrl.trim() || null,
        sort_order: Number(sortOrder) || 0,
        is_global: isGlobal,
      })
      if (result.error) {
        showToast(result.error, true)
      } else if (result.banner) {
        setItems((prev) => sortBanners([result.banner!, ...prev]))
        showToast(t('toast.bannerCreated'))
        setSheetOpen(false)
      }
    }
    setSubmitting(false)
  }

  async function handleToggle(item: AdBanner) {
    const result = await toggleAdBannerAction(item.id, !item.is_active)
    if (result.error) showToast(result.error, true)
    else setItems((prev) => prev.map((b) => (b.id === item.id ? { ...b, is_active: !b.is_active } : b)))
  }

  async function handleDelete(id: string) {
    const result = await deleteAdBannerAction(id)
    if (result.error) showToast(result.error, true)
    else {
      setItems((prev) => prev.filter((b) => b.id !== id))
      showToast(t('toast.bannerDeleted'))
    }
    setDeleteTarget(null)
  }

  async function handleReorder(item: AdBanner, dir: -1 | 1) {
    const next = item.sort_order + dir
    const result = await reorderAdBannerAction(item.id, next)
    if (result.error) showToast(result.error, true)
    else setItems((prev) => sortBanners(prev.map((b) => (b.id === item.id ? { ...b, sort_order: next } : b))))
  }

  return (
    <>
      <ToastViewport toasts={toasts} />

      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: '#7A8BA8' }}>
          {t('banners.count', { count: items.length })}
        </p>
        <AddButton label={t('banners.add')} onClick={openCreate} />
      </div>

      {items.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-2xl py-16"
          style={{ background: 'rgba(255,255,255,0.7)' }}
        >
          <Images className="size-10 mb-3" style={{ color: '#C9A84C', opacity: 0.4 }} />
          <p className="text-sm" style={{ color: '#7A8BA8' }}>
            {t('banners.empty')}
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image_url}
                alt={item.title ?? ''}
                className="size-20 shrink-0 rounded-xl object-cover"
                style={{ background: 'rgba(27,45,91,0.06)' }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
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
                <p className="font-semibold text-sm leading-snug truncate" style={{ color: '#1B2D5B' }}>
                  {item.title || t('banners.untitled')}
                </p>
                {item.link_url && (
                  <p className="mt-0.5 truncate text-xs" style={{ color: '#7A8BA8' }}>
                    {item.link_url}
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
          ))}
        </div>
      )}

      {deleteTarget && (
        <DeleteConfirm
          title={t('banners.deleteTitle')}
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
              {t('tabs.banners')}
            </p>
            <SheetTitle className="font-heading text-xl font-bold" style={{ color: '#1B2D5B' }}>
              {editing ? t('banners.editTitle') : t('banners.add')}
            </SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="px-6 pb-8 space-y-5">
            <div>
              <FieldLabel>{t('fields.imageUrl')}</FieldLabel>
              <TextField
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                required
                placeholder="https://…"
              />
            </div>

            <div>
              <FieldLabel optional={t('common.optional')}>{t('fields.title')}</FieldLabel>
              <TextField value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div>
              <FieldLabel optional={t('common.optional')}>{t('fields.linkUrl')}</FieldLabel>
              <TextField
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>

            <div>
              <FieldLabel>{t('fields.sortOrder')}</FieldLabel>
              <TextField
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              />
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
              disabled={submitting || !imageUrl.trim()}
            />
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}
