'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Public, anon-readable landing CMS reads (SCHEMA-CONTRACT §1/§6).
 *
 * These are the ONLY anon-readable rows in the entire schema. RLS already
 * filters anon SELECT to `is_active = true`, but we filter explicitly here
 * too so the behaviour is identical whether the visitor is anonymous or
 * authenticated. Read-only — never writes. Actions never throw.
 *
 * The CMS tables (ad_banners, flash_sales, showcase_hotels) are NOT typed in
 * database.ts, so we cast the client to `any` per repo convention.
 */

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

export type LandingContent = {
  banners: AdBanner[]
  flashSales: FlashSale[]
  hotels: ShowcaseHotel[]
}

/**
 * Fetch everything the public landing page renders in a single round-trip
 * batch. Each query is independent and isolated: a failure in one returns an
 * empty list for that section rather than failing the whole page.
 */
export async function getLandingContentAction(): Promise<LandingContent> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [bannersRes, salesRes, hotelsRes] = await Promise.all([
    db
      .from('ad_banners')
      .select('id, hotel_id, image_url, title, link_url, sort_order, is_active, created_at')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    db
      .from('flash_sales')
      .select('id, hotel_id, title, description, image_url, discount_label, starts_at, ends_at, is_active, sort_order, created_at')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    db
      .from('showcase_hotels')
      .select('id, name, image_url, location, indicative_price, rating, sort_order, is_active, created_at')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
  ])

  return {
    banners: (bannersRes.data ?? []) as AdBanner[],
    flashSales: (salesRes.data ?? []) as FlashSale[],
    hotels: (hotelsRes.data ?? []) as ShowcaseHotel[],
  }
}
