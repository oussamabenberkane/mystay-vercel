'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ChevronRight,
  Tag,
  Image as ImageIcon,
} from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import {
  createMenuCategoryAction,
  updateMenuCategoryAction,
  deleteMenuCategoryAction,
  createMenuItemAction,
  updateMenuItemAction,
  toggleMenuItemAvailabilityAction,
  deleteMenuItemAction,
} from '@/lib/actions/admin-menu'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils/format'

type MenuItem = {
  id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  is_available: boolean
  sort_order: number
  category_id: string
}

type Category = {
  id: string
  name: string
  sort_order: number
  menu_items: MenuItem[]
}

const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
})

const itemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  description: z.string().optional(),
  price: z.number().positive('Price must be positive'),
  categoryId: z.string().min(1, 'Category is required'),
  isAvailable: z.boolean(),
})

type CategoryForm = z.infer<typeof categorySchema>
type ItemForm = z.infer<typeof itemSchema>

interface MenuClientProps {
  categories: Category[]
  hotelId: string
}

export function MenuClient({ categories, hotelId }: MenuClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    categories[0]?.id ?? null
  )
  const [actionError, setActionError] = useState<string | null>(null)

  // Category dialogs
  const [catAddOpen, setCatAddOpen] = useState(false)
  const [catEditTarget, setCatEditTarget] = useState<Category | null>(null)
  const [catDeleteTarget, setCatDeleteTarget] = useState<Category | null>(null)

  // Item dialogs
  const [itemAddOpen, setItemAddOpen] = useState(false)
  const [itemEditTarget, setItemEditTarget] = useState<MenuItem | null>(null)
  const [itemDeleteTarget, setItemDeleteTarget] = useState<MenuItem | null>(null)

  // Image upload state
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId)

  // Category forms
  const catForm = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
  })
  const catEditForm = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
  })

  // Item forms
  const itemForm = useForm<ItemForm>({
    resolver: zodResolver(itemSchema),
    defaultValues: { categoryId: selectedCategoryId ?? '', isAvailable: true },
  })
  const itemEditForm = useForm<ItemForm>({
    resolver: zodResolver(itemSchema),
    defaultValues: { isAvailable: true },
  })

  async function handleImageUpload(file: File) {
    setUploadingImage(true)
    try {
      const supabase = createClient()
      const path = `${hotelId}/${Date.now()}-${file.name}`
      const { data, error } = await supabase.storage.from('menu-images').upload(path, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('menu-images').getPublicUrl(data.path)
      setImageUrl(publicUrl)
      setImagePreview(publicUrl)
    } catch {
      setActionError('Image upload failed')
    } finally {
      setUploadingImage(false)
    }
  }

  // --- Category handlers ---
  async function onAddCategory(data: CategoryForm) {
    setActionError(null)
    const result = await createMenuCategoryAction(data.name, categories.length)
    if (result.error) { setActionError(result.error) } else {
      catForm.reset()
      setCatAddOpen(false)
      router.refresh()
    }
  }

  async function onEditCategory(data: CategoryForm) {
    if (!catEditTarget) return
    setActionError(null)
    const result = await updateMenuCategoryAction(catEditTarget.id, { name: data.name })
    if (result.error) { setActionError(result.error) } else {
      catEditForm.reset()
      setCatEditTarget(null)
      router.refresh()
    }
  }

  function handleDeleteCategory() {
    if (!catDeleteTarget) return
    startTransition(async () => {
      const result = await deleteMenuCategoryAction(catDeleteTarget.id)
      setCatDeleteTarget(null)
      if (result.error) setActionError(result.error)
      else {
        if (selectedCategoryId === catDeleteTarget.id) {
          setSelectedCategoryId(categories.find((c) => c.id !== catDeleteTarget.id)?.id ?? null)
        }
        router.refresh()
      }
    })
  }

  // --- Item handlers ---
  async function onAddItem(data: ItemForm) {
    setActionError(null)
    const result = await createMenuItemAction({
      categoryId: data.categoryId,
      name: data.name,
      description: data.description,
      price: data.price,
      imageUrl: imageUrl ?? undefined,
      isAvailable: data.isAvailable,
    })
    if (result.error) { setActionError(result.error) } else {
      itemForm.reset()
      setImageUrl(null)
      setImagePreview(null)
      setItemAddOpen(false)
      router.refresh()
    }
  }

  async function onEditItem(data: ItemForm) {
    if (!itemEditTarget) return
    setActionError(null)
    const result = await updateMenuItemAction(itemEditTarget.id, {
      name: data.name,
      description: data.description ?? null,
      price: data.price,
      imageUrl: imageUrl ?? itemEditTarget.image_url,
      isAvailable: data.isAvailable,
      categoryId: data.categoryId,
    })
    if (result.error) { setActionError(result.error) } else {
      itemEditForm.reset()
      setImageUrl(null)
      setImagePreview(null)
      setItemEditTarget(null)
      router.refresh()
    }
  }

  function handleToggleAvailability(item: MenuItem) {
    startTransition(async () => {
      await toggleMenuItemAvailabilityAction(item.id, !item.is_available)
      router.refresh()
    })
  }

  function handleDeleteItem() {
    if (!itemDeleteTarget) return
    startTransition(async () => {
      const result = await deleteMenuItemAction(itemDeleteTarget.id)
      setItemDeleteTarget(null)
      if (result.error) setActionError(result.error)
      else router.refresh()
    })
  }

  function openItemAdd() {
    itemForm.reset({ categoryId: selectedCategoryId ?? '', isAvailable: true })
    setImageUrl(null)
    setImagePreview(null)
    setItemAddOpen(true)
  }

  function openItemEdit(item: MenuItem) {
    itemEditForm.reset({
      name: item.name,
      description: item.description ?? '',
      price: item.price,
      categoryId: item.category_id,
      isAvailable: item.is_available,
    })
    setImageUrl(null)
    setImagePreview(item.image_url)
    setItemEditTarget(item)
  }

  function openCatEdit(cat: Category) {
    catEditForm.reset({ name: cat.name })
    setCatEditTarget(cat)
  }

  return (
    <div className="flex gap-6">
      {/* Left: Category list */}
      <div className="w-64 shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#7A8BA8' }}>
            Categories
          </p>
          <button
            onClick={() => setCatAddOpen(true)}
            className="flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors hover:bg-[rgba(27,45,91,0.12)]"
            style={{ color: '#1B2D5B', background: 'rgba(27,45,91,0.07)' }}
          >
            <Plus className="size-3" />
            Add
          </button>
        </div>

        <div className="space-y-1">
          {categories.length === 0 ? (
            <p className="text-sm px-2 py-4 text-center" style={{ color: '#7A8BA8' }}>
              No categories yet
            </p>
          ) : (
            categories.map((cat) => {
              const isActive = cat.id === selectedCategoryId
              return (
                <div
                  key={cat.id}
                  className="group flex items-center gap-2 rounded-xl px-3 py-2.5 cursor-pointer transition-all"
                  style={
                    isActive
                      ? { background: '#1B2D5B' }
                      : { background: 'rgba(255,255,255,0.7)' }
                  }
                  onClick={() => setSelectedCategoryId(cat.id)}
                >
                  <Tag className="size-3.5 shrink-0" style={{ color: isActive ? '#C9A84C' : '#7A8BA8' }} />
                  <span
                    className="flex-1 text-sm font-medium truncate"
                    style={{ color: isActive ? '#F8F0E8' : '#1B2D5B' }}
                  >
                    {cat.name}
                  </span>
                  <span
                    className="text-xs shrink-0"
                    style={{ color: isActive ? 'rgba(248,240,232,0.5)' : '#7A8BA8' }}
                  >
                    {cat.menu_items.length}
                  </span>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); openCatEdit(cat) }}
                      className="flex size-5 items-center justify-center rounded hover:bg-white/10"
                      style={{ color: isActive ? 'rgba(248,240,232,0.7)' : '#7A8BA8' }}
                    >
                      <Pencil className="size-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setCatDeleteTarget(cat) }}
                      className="flex size-5 items-center justify-center rounded hover:bg-white/10"
                      style={{ color: isActive ? 'rgba(248,240,232,0.7)' : '#C0392B' }}
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Right: Items */}
      <div className="flex-1 min-w-0 space-y-4">
        {actionError && (
          <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(192,57,43,0.08)', color: '#C0392B' }}>
            {actionError}
            <button className="ml-2 cursor-pointer underline hover:no-underline" onClick={() => setActionError(null)}>Dismiss</button>
          </div>
        )}

        {!selectedCategory ? (
          <div className="card-warm p-12 text-center">
            <p className="text-sm" style={{ color: '#7A8BA8' }}>
              Select a category or create one to get started
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: '#7A8BA8' }}>Categories</span>
                  <ChevronRight className="size-3" style={{ color: '#7A8BA8' }} />
                  <span className="font-heading text-lg font-semibold" style={{ color: '#1B2D5B' }}>
                    {selectedCategory.name}
                  </span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: '#7A8BA8' }}>
                  {selectedCategory.menu_items.length} items
                </p>
              </div>
              <Button
                onClick={openItemAdd}
                className="flex items-center gap-2 rounded-xl text-sm"
                style={{ background: '#1B2D5B', color: '#F8F0E8' }}
              >
                <Plus className="size-4" />
                Add Item
              </Button>
            </div>

            {selectedCategory.menu_items.length === 0 ? (
              <div className="card-warm p-12 text-center">
                <p className="text-sm" style={{ color: '#7A8BA8' }}>
                  No items in this category yet
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {selectedCategory.menu_items
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((item) => (
                    <div key={item.id} className="card-warm overflow-hidden">
                      {/* Image */}
                      {item.image_url ? (
                        <div className="h-36 overflow-hidden">
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div
                          className="h-24 flex items-center justify-center"
                          style={{ background: 'rgba(248,240,232,0.8)' }}
                        >
                          <ImageIcon className="size-8" style={{ color: '#C9A84C', opacity: 0.4 }} />
                        </div>
                      )}

                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-semibold text-sm leading-tight" style={{ color: '#1B2D5B' }}>
                            {item.name}
                          </p>
                          <span className="font-heading text-base font-bold shrink-0" style={{ color: '#C9A84C' }}>
                            {formatCurrency(item.price)}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-xs leading-relaxed mb-3 line-clamp-2" style={{ color: '#7A8BA8' }}>
                            {item.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between mt-3">
                          {/* Availability toggle */}
                          <button
                            onClick={() => handleToggleAvailability(item)}
                            disabled={isPending}
                            className="flex cursor-pointer items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-75 disabled:cursor-not-allowed disabled:opacity-50"
                            style={{ color: item.is_available ? '#16a34a' : '#7A8BA8' }}
                          >
                            {item.is_available ? (
                              <ToggleRight className="size-4" />
                            ) : (
                              <ToggleLeft className="size-4" />
                            )}
                            {item.is_available ? 'Available' : 'Hidden'}
                          </button>

                          <div className="flex gap-1">
                            <button
                              onClick={() => openItemEdit(item)}
                              className="flex size-7 items-center justify-center rounded-lg transition-colors hover:bg-black/5"
                              style={{ color: '#7A8BA8' }}
                            >
                              <Pencil className="size-3.5" />
                            </button>
                            <button
                              onClick={() => setItemDeleteTarget(item)}
                              className="flex size-7 items-center justify-center rounded-lg transition-colors hover:bg-red-50"
                              style={{ color: '#C0392B' }}
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Category Dialog */}
      <Dialog open={catAddOpen} onOpenChange={(o) => { setCatAddOpen(o); if (!o) catForm.reset() }}>
        <DialogContent style={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 8px 40px rgba(27,45,91,0.14)' }}>
          <DialogHeader>
            <DialogTitle className="font-heading text-xl" style={{ color: '#1B2D5B' }}>
              New Category
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={catForm.handleSubmit(onAddCategory)} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#7A8BA8' }}>
                Category Name
              </Label>
              <Input
                {...catForm.register('name')}
                placeholder="e.g. Beverages, Desserts…"
                className="rounded-xl"
                style={{ borderColor: 'rgba(27,45,91,0.12)' }}
              />
              {catForm.formState.errors.name && (
                <p className="text-xs text-red-500">{catForm.formState.errors.name.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCatAddOpen(false)} className="rounded-xl" style={{ borderColor: 'rgba(27,45,91,0.12)', color: '#7A8BA8' }}>
                Cancel
              </Button>
              <Button type="submit" disabled={catForm.formState.isSubmitting} className="rounded-xl" style={{ background: '#1B2D5B', color: '#F8F0E8' }}>
                {catForm.formState.isSubmitting ? 'Creating…' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={!!catEditTarget} onOpenChange={(o) => { if (!o) setCatEditTarget(null); catEditForm.reset() }}>
        <DialogContent style={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 8px 40px rgba(27,45,91,0.14)' }}>
          <DialogHeader>
            <DialogTitle className="font-heading text-xl" style={{ color: '#1B2D5B' }}>
              Edit Category
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={catEditForm.handleSubmit(onEditCategory)} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#7A8BA8' }}>
                Category Name
              </Label>
              <Input
                {...catEditForm.register('name')}
                className="rounded-xl"
                style={{ borderColor: 'rgba(27,45,91,0.12)' }}
              />
              {catEditForm.formState.errors.name && (
                <p className="text-xs text-red-500">{catEditForm.formState.errors.name.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCatEditTarget(null)} className="rounded-xl" style={{ borderColor: 'rgba(27,45,91,0.12)', color: '#7A8BA8' }}>
                Cancel
              </Button>
              <Button type="submit" disabled={catEditForm.formState.isSubmitting} className="rounded-xl" style={{ background: '#1B2D5B', color: '#F8F0E8' }}>
                {catEditForm.formState.isSubmitting ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Item form dialog (shared for add + edit) */}
      {[
        { open: itemAddOpen, onClose: () => { setItemAddOpen(false); itemForm.reset(); setImageUrl(null); setImagePreview(null) }, form: itemForm, onSubmit: onAddItem, title: 'Add Menu Item' },
        { open: !!itemEditTarget, onClose: () => { setItemEditTarget(null); itemEditForm.reset(); setImageUrl(null); setImagePreview(null) }, form: itemEditForm, onSubmit: onEditItem, title: 'Edit Menu Item' },
      ].map(({ open, onClose, form, onSubmit, title }) => (
        <Dialog key={title} open={open} onOpenChange={(o) => !o && onClose()}>
          <DialogContent
            className="sm:max-w-lg"
            style={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 8px 40px rgba(27,45,91,0.14)' }}
          >
            <DialogHeader>
              <DialogTitle className="font-heading text-xl" style={{ color: '#1B2D5B' }}>
                {title}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#7A8BA8' }}>
                  Name
                </Label>
                <Input
                  {...form.register('name')}
                  placeholder="e.g. Caesar Salad"
                  className="rounded-xl"
                  style={{ borderColor: 'rgba(27,45,91,0.12)' }}
                />
                {form.formState.errors.name && <p className="text-xs text-red-500">{(form.formState.errors.name as any)?.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#7A8BA8' }}>
                  Description (optional)
                </Label>
                <Textarea
                  {...form.register('description')}
                  placeholder="Brief description…"
                  rows={2}
                  className="rounded-xl resize-none"
                  style={{ borderColor: 'rgba(27,45,91,0.12)' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#7A8BA8' }}>
                    Price (DA)
                  </Label>
                  <Input
                    {...form.register('price', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="rounded-xl"
                    style={{ borderColor: 'rgba(27,45,91,0.12)' }}
                  />
                  {form.formState.errors.price && <p className="text-xs text-red-500">{(form.formState.errors.price as any)?.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#7A8BA8' }}>
                    Category
                  </Label>
                  <Select
                    value={form.watch('categoryId') ?? ''}
                    onValueChange={(v) => form.setValue('categoryId', v ?? '')}
                  >
                    <SelectTrigger className="rounded-xl" style={{ borderColor: 'rgba(27,45,91,0.12)' }}>
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Image upload */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#7A8BA8' }}>
                  Image (optional)
                </Label>
                {imagePreview && (
                  <div className="rounded-xl overflow-hidden h-32">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  disabled={uploadingImage}
                  className="rounded-xl text-sm"
                  style={{ borderColor: 'rgba(27,45,91,0.12)' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleImageUpload(file)
                  }}
                />
                {uploadingImage && (
                  <p className="text-xs" style={{ color: '#7A8BA8' }}>Uploading…</p>
                )}
              </div>

              {/* Availability */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => form.setValue('isAvailable', !form.watch('isAvailable'))}
                  className="cursor-pointer transition-opacity hover:opacity-75"
                  style={{ color: form.watch('isAvailable') ? '#16a34a' : '#7A8BA8' }}
                >
                  {form.watch('isAvailable') ? (
                    <ToggleRight className="size-6" />
                  ) : (
                    <ToggleLeft className="size-6" />
                  )}
                </button>
                <span className="text-sm" style={{ color: '#1B2D5B' }}>
                  {form.watch('isAvailable') ? 'Available to guests' : 'Hidden from menu'}
                </span>
              </div>

              {actionError && (
                <p className="text-sm rounded-xl px-3 py-2" style={{ background: 'rgba(192,57,43,0.08)', color: '#C0392B' }}>
                  {actionError}
                </p>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose} className="rounded-xl" style={{ borderColor: 'rgba(27,45,91,0.12)', color: '#7A8BA8' }}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting || uploadingImage}
                  className="rounded-xl"
                  style={{ background: '#1B2D5B', color: '#F8F0E8' }}
                >
                  {form.formState.isSubmitting ? 'Saving…' : title.startsWith('Add') ? 'Add Item' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ))}

      {/* Delete category confirm */}
      <ConfirmDialog
        open={!!catDeleteTarget}
        onOpenChange={(o) => !o && setCatDeleteTarget(null)}
        title="Delete Category"
        description={`Delete "${catDeleteTarget?.name}"? You must remove all items first.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteCategory}
        isLoading={isPending}
        variant="destructive"
      />

      {/* Delete item confirm */}
      <ConfirmDialog
        open={!!itemDeleteTarget}
        onOpenChange={(o) => !o && setItemDeleteTarget(null)}
        title="Delete Item"
        description={`Delete "${itemDeleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteItem}
        isLoading={isPending}
        variant="destructive"
      />
    </div>
  )
}
