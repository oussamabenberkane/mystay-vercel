'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getAdminHotelId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profileData } = await supabase
    .from('profiles')
    .select('role, hotel_id')
    .eq('id', user.id)
    .single()

  const profile = profileData as { role: string; hotel_id: string } | null
  if (!profile || profile.role !== 'admin') return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { supabase: supabase as any, hotelId: profile.hotel_id }
}

export async function createMenuCategoryAction(name: string, sortOrder?: number) {
  const ctx = await getAdminHotelId()
  if (!ctx) return { error: 'Unauthorized' }

  const { data, error } = await ctx.supabase
    .from('menu_categories')
    .insert({ hotel_id: ctx.hotelId, name, sort_order: sortOrder ?? 0 } as any)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return { category: data }
}

export async function updateMenuCategoryAction(
  id: string,
  data: { name?: string; sortOrder?: number }
) {
  const ctx = await getAdminHotelId()
  if (!ctx) return { error: 'Unauthorized' }

  const patch: Record<string, unknown> = {}
  if (data.name !== undefined) patch.name = data.name
  if (data.sortOrder !== undefined) patch.sort_order = data.sortOrder

  const { error } = await ctx.supabase
    .from('menu_categories')
    .update(patch as any)
    .eq('id', id)
    .eq('hotel_id', ctx.hotelId)

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return {}
}

export async function deleteMenuCategoryAction(id: string) {
  const ctx = await getAdminHotelId()
  if (!ctx) return { error: 'Unauthorized' }

  const { count } = await ctx.supabase
    .from('menu_items')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', id)

  if (count && count > 0) {
    return { error: 'Remove all items from this category before deleting it.' }
  }

  const { error } = await ctx.supabase
    .from('menu_categories')
    .delete()
    .eq('id', id)
    .eq('hotel_id', ctx.hotelId)

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return {}
}

export async function createMenuItemAction(data: {
  categoryId: string
  name: string
  description?: string
  price: number
  imageUrl?: string
  isAvailable?: boolean
  sortOrder?: number
}) {
  const ctx = await getAdminHotelId()
  if (!ctx) return { error: 'Unauthorized' }

  const { data: item, error } = await ctx.supabase
    .from('menu_items')
    .insert({
      hotel_id: ctx.hotelId,
      category_id: data.categoryId,
      name: data.name,
      description: data.description ?? null,
      price: data.price,
      image_url: data.imageUrl ?? null,
      is_available: data.isAvailable ?? true,
      sort_order: data.sortOrder ?? 0,
    } as any)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return { item }
}

export async function updateMenuItemAction(
  id: string,
  data: {
    name?: string
    description?: string | null
    price?: number
    imageUrl?: string | null
    isAvailable?: boolean
    sortOrder?: number
    categoryId?: string
  }
) {
  const ctx = await getAdminHotelId()
  if (!ctx) return { error: 'Unauthorized' }

  const patch: Record<string, unknown> = {}
  if (data.name !== undefined) patch.name = data.name
  if (data.description !== undefined) patch.description = data.description
  if (data.price !== undefined) patch.price = data.price
  if (data.imageUrl !== undefined) patch.image_url = data.imageUrl
  if (data.isAvailable !== undefined) patch.is_available = data.isAvailable
  if (data.sortOrder !== undefined) patch.sort_order = data.sortOrder
  if (data.categoryId !== undefined) patch.category_id = data.categoryId

  const { error } = await ctx.supabase
    .from('menu_items')
    .update(patch as any)
    .eq('id', id)
    .eq('hotel_id', ctx.hotelId)

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return {}
}

export async function toggleMenuItemAvailabilityAction(id: string, isAvailable: boolean) {
  const ctx = await getAdminHotelId()
  if (!ctx) return { error: 'Unauthorized' }

  const { error } = await ctx.supabase
    .from('menu_items')
    .update({ is_available: isAvailable } as any)
    .eq('id', id)
    .eq('hotel_id', ctx.hotelId)

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return {}
}

export async function deleteMenuItemAction(id: string) {
  const ctx = await getAdminHotelId()
  if (!ctx) return { error: 'Unauthorized' }

  const { error } = await ctx.supabase
    .from('menu_items')
    .delete()
    .eq('id', id)
    .eq('hotel_id', ctx.hotelId)

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return {}
}
