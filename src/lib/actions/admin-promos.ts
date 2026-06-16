'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient, serviceRoleConfigError } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// ---------------------------------------------------------------------------
// Types (these three CMS tables are NOT in database.ts — use `db as any`)
// ---------------------------------------------------------------------------

export type AdBanner = {
  id: string
  hotel_id: string | null
  image_url: string
  title: string | null
  link_url: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

export type FlashSale = {
  id: string
  hotel_id: string | null
  title: string
  description: string | null
  image_url: string | null
  discount_label: string | null
  starts_at: string | null
  ends_at: string | null
  is_active: boolean
  sort_order: number
  created_at: string
}

export type ShowcaseHotel = {
  id: string
  name: string
  image_url: string | null
  location: string | null
  indicative_price: number | null
  rating: number | null
  sort_order: number
  is_active: boolean
  created_at: string
}

// ---------------------------------------------------------------------------
// Admin context — mirrors announcements.ts getAdminCtx()
// ---------------------------------------------------------------------------

async function getAdminCtx() {
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

// Service-role client — only used AFTER admin role is verified in getAdminCtx().
// Required for global rows (hotel_id = NULL) on banners/flash_sales and for all
// showcase_hotels writes, which RLS blocks for a tenant admin.
//
// `createAdminClient()` throws when the service-role key is missing/placeholder;
// every action that uses svc() first checks `serviceRoleConfigError()` and
// returns that reason as a visible error string (the convention here is that
// actions never throw — they return { …, error }).
function svc() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createAdminClient() as any
}

// ===========================================================================
// AD BANNERS
// ===========================================================================

export async function getAdBannersAdminAction(): Promise<{ banners: AdBanner[]; error?: string }> {
  const ctx = await getAdminCtx()
  if (!ctx) return { banners: [], error: 'Unauthorized' }

  const cfg = serviceRoleConfigError()
  if (cfg) return { banners: [], error: cfg }

  // Read via service-role so the admin sees both their hotel's rows and global
  // (hotel_id IS NULL) rows reliably regardless of RLS read scope.
  const { data, error } = await svc()
    .from('ad_banners')
    .select('*')
    .or(`hotel_id.eq.${ctx.hotelId},hotel_id.is.null`)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) return { banners: [], error: error.message }
  return { banners: (data ?? []) as AdBanner[] }
}

export async function createAdBannerAction(input: {
  image_url: string
  title?: string | null
  link_url?: string | null
  sort_order?: number
  is_global?: boolean
}): Promise<{ banner?: AdBanner; error?: string }> {
  const ctx = await getAdminCtx()
  if (!ctx) return { error: 'Unauthorized' }

  if (!input.image_url || !input.image_url.trim()) return { error: 'Image URL is required.' }

  const isGlobal = input.is_global === true
  // Global rows require the service-role client (RLS blocks a tenant admin from
  // inserting hotel_id IS NULL). Per-hotel rows go through the RLS client.
  if (isGlobal) {
    const cfg = serviceRoleConfigError()
    if (cfg) return { error: cfg }
  }

  const row = {
    hotel_id: isGlobal ? null : ctx.hotelId,
    image_url: input.image_url.trim(),
    title: input.title?.trim() || null,
    link_url: input.link_url?.trim() || null,
    sort_order: input.sort_order ?? 0,
  }

  const client = isGlobal ? svc() : ctx.supabase
  const { data, error } = await client.from('ad_banners').insert(row).select().single()

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return { banner: data as AdBanner }
}

export async function updateAdBannerAction(
  id: string,
  input: {
    image_url?: string
    title?: string | null
    link_url?: string | null
    sort_order?: number
  }
): Promise<{ banner?: AdBanner; error?: string }> {
  const ctx = await getAdminCtx()
  if (!ctx) return { error: 'Unauthorized' }

  const cfg = serviceRoleConfigError()
  if (cfg) return { error: cfg }

  if (input.image_url !== undefined && !input.image_url.trim()) {
    return { error: 'Image URL is required.' }
  }

  const patch: Record<string, unknown> = {}
  if (input.image_url !== undefined) patch.image_url = input.image_url.trim()
  if (input.title !== undefined) patch.title = input.title?.trim() || null
  if (input.link_url !== undefined) patch.link_url = input.link_url?.trim() || null
  if (input.sort_order !== undefined) patch.sort_order = input.sort_order

  // Use service-role for updates so we can edit global rows too; the row id is
  // already constrained to this admin's visible set by getAdBannersAdminAction.
  const { data, error } = await svc()
    .from('ad_banners')
    .update(patch)
    .eq('id', id)
    .or(`hotel_id.eq.${ctx.hotelId},hotel_id.is.null`)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return { banner: data as AdBanner }
}

export async function toggleAdBannerAction(id: string, is_active: boolean): Promise<{ error?: string }> {
  const ctx = await getAdminCtx()
  if (!ctx) return { error: 'Unauthorized' }

  const cfg = serviceRoleConfigError()
  if (cfg) return { error: cfg }

  const { error } = await svc()
    .from('ad_banners')
    .update({ is_active })
    .eq('id', id)
    .or(`hotel_id.eq.${ctx.hotelId},hotel_id.is.null`)

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return {}
}

export async function deleteAdBannerAction(id: string): Promise<{ error?: string }> {
  const ctx = await getAdminCtx()
  if (!ctx) return { error: 'Unauthorized' }

  const cfg = serviceRoleConfigError()
  if (cfg) return { error: cfg }

  const { error } = await svc()
    .from('ad_banners')
    .delete()
    .eq('id', id)
    .or(`hotel_id.eq.${ctx.hotelId},hotel_id.is.null`)

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return {}
}

export async function reorderAdBannerAction(id: string, sort_order: number): Promise<{ error?: string }> {
  const ctx = await getAdminCtx()
  if (!ctx) return { error: 'Unauthorized' }

  const cfg = serviceRoleConfigError()
  if (cfg) return { error: cfg }

  const { error } = await svc()
    .from('ad_banners')
    .update({ sort_order })
    .eq('id', id)
    .or(`hotel_id.eq.${ctx.hotelId},hotel_id.is.null`)

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return {}
}

// ===========================================================================
// FLASH SALES
// ===========================================================================

function validateSaleWindow(starts_at?: string | null, ends_at?: string | null): string | null {
  if (starts_at && ends_at) {
    const s = new Date(starts_at).getTime()
    const e = new Date(ends_at).getTime()
    if (!Number.isNaN(s) && !Number.isNaN(e) && e <= s) {
      return 'End date must be after the start date.'
    }
  }
  return null
}

export async function getFlashSalesAdminAction(): Promise<{ sales: FlashSale[]; error?: string }> {
  const ctx = await getAdminCtx()
  if (!ctx) return { sales: [], error: 'Unauthorized' }

  const cfg = serviceRoleConfigError()
  if (cfg) return { sales: [], error: cfg }

  const { data, error } = await svc()
    .from('flash_sales')
    .select('*')
    .or(`hotel_id.eq.${ctx.hotelId},hotel_id.is.null`)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) return { sales: [], error: error.message }
  return { sales: (data ?? []) as FlashSale[] }
}

export async function createFlashSaleAction(input: {
  title: string
  description?: string | null
  image_url?: string | null
  discount_label?: string | null
  starts_at?: string | null
  ends_at?: string | null
  sort_order?: number
  is_global?: boolean
}): Promise<{ sale?: FlashSale; error?: string }> {
  const ctx = await getAdminCtx()
  if (!ctx) return { error: 'Unauthorized' }

  if (!input.title || !input.title.trim()) return { error: 'Title is required.' }

  const windowError = validateSaleWindow(input.starts_at, input.ends_at)
  if (windowError) return { error: windowError }

  const isGlobal = input.is_global === true
  if (isGlobal) {
    const cfg = serviceRoleConfigError()
    if (cfg) return { error: cfg }
  }

  const row = {
    hotel_id: isGlobal ? null : ctx.hotelId,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    image_url: input.image_url?.trim() || null,
    discount_label: input.discount_label?.trim() || null,
    starts_at: input.starts_at || null,
    ends_at: input.ends_at || null,
    sort_order: input.sort_order ?? 0,
  }

  const client = isGlobal ? svc() : ctx.supabase
  const { data, error } = await client.from('flash_sales').insert(row).select().single()

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return { sale: data as FlashSale }
}

export async function updateFlashSaleAction(
  id: string,
  input: {
    title?: string
    description?: string | null
    image_url?: string | null
    discount_label?: string | null
    starts_at?: string | null
    ends_at?: string | null
    sort_order?: number
  }
): Promise<{ sale?: FlashSale; error?: string }> {
  const ctx = await getAdminCtx()
  if (!ctx) return { error: 'Unauthorized' }

  const cfg = serviceRoleConfigError()
  if (cfg) return { error: cfg }

  if (input.title !== undefined && !input.title.trim()) return { error: 'Title is required.' }

  const windowError = validateSaleWindow(input.starts_at, input.ends_at)
  if (windowError) return { error: windowError }

  const patch: Record<string, unknown> = {}
  if (input.title !== undefined) patch.title = input.title.trim()
  if (input.description !== undefined) patch.description = input.description?.trim() || null
  if (input.image_url !== undefined) patch.image_url = input.image_url?.trim() || null
  if (input.discount_label !== undefined) patch.discount_label = input.discount_label?.trim() || null
  if (input.starts_at !== undefined) patch.starts_at = input.starts_at || null
  if (input.ends_at !== undefined) patch.ends_at = input.ends_at || null
  if (input.sort_order !== undefined) patch.sort_order = input.sort_order

  const { data, error } = await svc()
    .from('flash_sales')
    .update(patch)
    .eq('id', id)
    .or(`hotel_id.eq.${ctx.hotelId},hotel_id.is.null`)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return { sale: data as FlashSale }
}

export async function toggleFlashSaleAction(id: string, is_active: boolean): Promise<{ error?: string }> {
  const ctx = await getAdminCtx()
  if (!ctx) return { error: 'Unauthorized' }

  const cfg = serviceRoleConfigError()
  if (cfg) return { error: cfg }

  const { error } = await svc()
    .from('flash_sales')
    .update({ is_active })
    .eq('id', id)
    .or(`hotel_id.eq.${ctx.hotelId},hotel_id.is.null`)

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return {}
}

export async function deleteFlashSaleAction(id: string): Promise<{ error?: string }> {
  const ctx = await getAdminCtx()
  if (!ctx) return { error: 'Unauthorized' }

  const cfg = serviceRoleConfigError()
  if (cfg) return { error: cfg }

  const { error } = await svc()
    .from('flash_sales')
    .delete()
    .eq('id', id)
    .or(`hotel_id.eq.${ctx.hotelId},hotel_id.is.null`)

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return {}
}

export async function reorderFlashSaleAction(id: string, sort_order: number): Promise<{ error?: string }> {
  const ctx = await getAdminCtx()
  if (!ctx) return { error: 'Unauthorized' }

  const cfg = serviceRoleConfigError()
  if (cfg) return { error: cfg }

  const { error } = await svc()
    .from('flash_sales')
    .update({ sort_order })
    .eq('id', id)
    .or(`hotel_id.eq.${ctx.hotelId},hotel_id.is.null`)

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return {}
}

// ===========================================================================
// SHOWCASE HOTELS (no tenancy — all writes need the service-role client)
// ===========================================================================

export async function getShowcaseHotelsAdminAction(): Promise<{ hotels: ShowcaseHotel[]; error?: string }> {
  const ctx = await getAdminCtx()
  if (!ctx) return { hotels: [], error: 'Unauthorized' }

  const cfg = serviceRoleConfigError()
  if (cfg) return { hotels: [], error: cfg }

  const { data, error } = await svc()
    .from('showcase_hotels')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) return { hotels: [], error: error.message }
  return { hotels: (data ?? []) as ShowcaseHotel[] }
}

export async function createShowcaseHotelAction(input: {
  name: string
  image_url?: string | null
  location?: string | null
  indicative_price?: number | null
  rating?: number | null
  sort_order?: number
}): Promise<{ hotel?: ShowcaseHotel; error?: string }> {
  const ctx = await getAdminCtx()
  if (!ctx) return { error: 'Unauthorized' }

  const cfg = serviceRoleConfigError()
  if (cfg) return { error: cfg }

  if (!input.name || !input.name.trim()) return { error: 'Name is required.' }

  const row = {
    name: input.name.trim(),
    image_url: input.image_url?.trim() || null,
    location: input.location?.trim() || null,
    indicative_price: input.indicative_price ?? null,
    rating: input.rating ?? null,
    sort_order: input.sort_order ?? 0,
  }

  const { data, error } = await svc().from('showcase_hotels').insert(row).select().single()

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return { hotel: data as ShowcaseHotel }
}

export async function updateShowcaseHotelAction(
  id: string,
  input: {
    name?: string
    image_url?: string | null
    location?: string | null
    indicative_price?: number | null
    rating?: number | null
    sort_order?: number
  }
): Promise<{ hotel?: ShowcaseHotel; error?: string }> {
  const ctx = await getAdminCtx()
  if (!ctx) return { error: 'Unauthorized' }

  const cfg = serviceRoleConfigError()
  if (cfg) return { error: cfg }

  if (input.name !== undefined && !input.name.trim()) return { error: 'Name is required.' }

  const patch: Record<string, unknown> = {}
  if (input.name !== undefined) patch.name = input.name.trim()
  if (input.image_url !== undefined) patch.image_url = input.image_url?.trim() || null
  if (input.location !== undefined) patch.location = input.location?.trim() || null
  if (input.indicative_price !== undefined) patch.indicative_price = input.indicative_price ?? null
  if (input.rating !== undefined) patch.rating = input.rating ?? null
  if (input.sort_order !== undefined) patch.sort_order = input.sort_order

  const { data, error } = await svc()
    .from('showcase_hotels')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return { hotel: data as ShowcaseHotel }
}

export async function toggleShowcaseHotelAction(id: string, is_active: boolean): Promise<{ error?: string }> {
  const ctx = await getAdminCtx()
  if (!ctx) return { error: 'Unauthorized' }

  const cfg = serviceRoleConfigError()
  if (cfg) return { error: cfg }

  const { error } = await svc().from('showcase_hotels').update({ is_active }).eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return {}
}

export async function deleteShowcaseHotelAction(id: string): Promise<{ error?: string }> {
  const ctx = await getAdminCtx()
  if (!ctx) return { error: 'Unauthorized' }

  const cfg = serviceRoleConfigError()
  if (cfg) return { error: cfg }

  const { error } = await svc().from('showcase_hotels').delete().eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return {}
}

export async function reorderShowcaseHotelAction(id: string, sort_order: number): Promise<{ error?: string }> {
  const ctx = await getAdminCtx()
  if (!ctx) return { error: 'Unauthorized' }

  const cfg = serviceRoleConfigError()
  if (cfg) return { error: cfg }

  const { error } = await svc().from('showcase_hotels').update({ sort_order }).eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return {}
}
