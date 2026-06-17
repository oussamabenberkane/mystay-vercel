'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Public, anon-readable reads for the hotel directory (/hotels and
 * /hotels/[slug]).
 *
 * Backed by the GLOBAL marketing table `showcase_hotels` — the same
 * deliberate anon-readable exception used by the landing CMS (see
 * 006_cms_landing.sql + 012_hotel_directory.sql). RLS already restricts
 * anon SELECT to `is_active = true`; we also filter explicitly so the
 * result is identical for anonymous and authenticated visitors.
 *
 * Read-only — never writes. Actions never throw: on failure they return
 * an empty list / null plus an `error` string. The CMS columns are not
 * typed in database.ts, so we cast the client to `any` per repo convention.
 */

export type DirectoryHotel = {
  id: string
  slug: string | null
  name: string
  image_url: string | null
  location: string | null
  indicative_price: number | null
  rating: number | null
  description: string | null
  amenities: string[]
  gallery: string[]
  phone: string | null
  email: string | null
  address: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

const COLUMNS =
  'id, slug, name, image_url, location, indicative_price, rating, description, amenities, gallery, phone, email, address, sort_order, is_active, created_at'

/** Normalise a raw row into a fully-shaped DirectoryHotel (arrays never null). */
function shape(row: Record<string, unknown>): DirectoryHotel {
  return {
    ...(row as DirectoryHotel),
    amenities: Array.isArray(row.amenities) ? (row.amenities as string[]) : [],
    gallery: Array.isArray(row.gallery) ? (row.gallery as string[]) : [],
  }
}

/**
 * All active directory hotels, ordered for display. The /hotels page
 * renders these server-side and the client browser applies search /
 * filtering / sorting in-memory (the directory is small and global).
 */
export async function getDirectoryHotelsAction(): Promise<{
  data: DirectoryHotel[]
  error: string | null
}> {
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const { data, error } = await db
      .from('showcase_hotels')
      .select(COLUMNS)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) return { data: [], error: error.message }
    return { data: (data ?? []).map(shape), error: null }
  } catch {
    return { data: [], error: 'Failed to load hotels.' }
  }
}

/**
 * A single active directory hotel by slug, for /hotels/[slug]. Returns
 * `{ data: null }` (no error) when the slug doesn't match an active row,
 * so the page can render a clean not-found state.
 */
export async function getDirectoryHotelBySlugAction(
  slug: string
): Promise<{ data: DirectoryHotel | null; error: string | null }> {
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const { data, error } = await db
      .from('showcase_hotels')
      .select(COLUMNS)
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle()

    if (error) return { data: null, error: error.message }
    return { data: data ? shape(data) : null, error: null }
  } catch {
    return { data: null, error: 'Failed to load hotel.' }
  }
}
