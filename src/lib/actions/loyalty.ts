'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/* -------------------------------------------------------------------------- */
/*  Earning rule — single tunable place                                       */
/* -------------------------------------------------------------------------- */

/**
 * Loyalty configuration. Tune the earning rules here, in ONE place.
 * - pointsPerCurrencyUnit: points earned per 1 unit of order `total_amount`.
 * - checkInBonus: fixed points awarded once on guest check-in.
 */
export const LOYALTY = {
  /** Points earned per 1 currency unit (DZD) of order total. */
  pointsPerCurrencyUnit: 1,
  /** Fixed bonus points awarded on check-in. */
  checkInBonus: 100,
} as const

/**
 * Convert a completed order's `total_amount` to earned loyalty points.
 * Floored to a non-negative integer (the RPC requires a positive integer to
 * actually credit; 0 is treated as "nothing to award").
 */
export function pointsForOrderAmount(total: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0
  return Math.max(0, Math.floor(total * LOYALTY.pointsPerCurrencyUnit))
}

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

export type LoyaltyTransaction = {
  id: string
  account_id: string
  hotel_id: string
  delta: number
  reason: string | null
  ref_type: string | null
  ref_id: string | null
  created_at: string
}

export type LoyaltyOffer = {
  id: string
  hotel_id: string
  title: string
  description: string | null
  points_cost: number
  is_active: boolean
  created_at: string
}

/* -------------------------------------------------------------------------- */
/*  Guest reads                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Current guest's loyalty balance + full transaction history (newest first).
 * If the guest has no account yet, returns balance 0 / empty history WITHOUT
 * creating an account (the award RPC lazily creates one on first earn).
 */
export async function getLoyaltyAction(): Promise<{
  balance: number
  transactions: LoyaltyTransaction[]
  error: string | null
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { balance: 0, transactions: [], error: 'Not authenticated' }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const { data: account, error: acctError } = await db
      .from('loyalty_accounts')
      .select('id, points_balance')
      .eq('guest_id', user.id)
      .maybeSingle()

    if (acctError) return { balance: 0, transactions: [], error: acctError.message }
    if (!account) return { balance: 0, transactions: [], error: null }

    const { data: txns, error: txnError } = await db
      .from('loyalty_transactions')
      .select('*')
      .eq('account_id', account.id)
      .order('created_at', { ascending: false })

    if (txnError) return { balance: account.points_balance ?? 0, transactions: [], error: txnError.message }

    return {
      balance: account.points_balance ?? 0,
      transactions: (txns ?? []) as LoyaltyTransaction[],
      error: null,
    }
  } catch {
    return { balance: 0, transactions: [], error: 'Unexpected error' }
  }
}

/**
 * Active offers in the current guest's hotel. RLS already scopes clients to
 * active offers in their own hotel; the `is_active` filter is belt-and-braces.
 */
export async function getLoyaltyOffersAction(): Promise<{
  offers: LoyaltyOffer[]
  error: string | null
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { offers: [], error: 'Not authenticated' }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const { data, error } = await db
      .from('loyalty_offers')
      .select('*')
      .eq('is_active', true)
      .order('points_cost', { ascending: true })

    if (error) return { offers: [], error: error.message }
    return { offers: (data ?? []) as LoyaltyOffer[], error: null }
  } catch {
    return { offers: [], error: 'Unexpected error' }
  }
}

/* -------------------------------------------------------------------------- */
/*  Redemption                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Redeem an offer for the current guest via the `redeem_loyalty_offer` RPC.
 * The RPC validates ownership/active/balance atomically and returns the new
 * balance. We map the known raised errors to clear messages.
 */
export async function redeemOfferAction(offerId: string): Promise<{
  balance: number | null
  error: string | null
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { balance: null, error: 'Not authenticated' }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const { data, error } = await db.rpc('redeem_loyalty_offer', { p_offer_id: offerId })

    if (error) {
      const msg = (error.message ?? '').toLowerCase()
      if (msg.includes('insufficient points balance')) {
        return { balance: null, error: 'INSUFFICIENT_BALANCE' }
      }
      if (msg.includes('offer is not active')) {
        return { balance: null, error: 'OFFER_INACTIVE' }
      }
      if (msg.includes('offer not found')) {
        return { balance: null, error: 'OFFER_NOT_FOUND' }
      }
      return { balance: null, error: error.message }
    }

    revalidatePath('/', 'layout')
    return { balance: typeof data === 'number' ? data : null, error: null }
  } catch {
    return { balance: null, error: 'Unexpected error' }
  }
}

/* -------------------------------------------------------------------------- */
/*  Earning helpers — all credits go through the award RPC                     */
/* -------------------------------------------------------------------------- */

/**
 * Award points for a completed (delivered) room-service order, proportional to
 * its `total_amount`. Best-effort: returns `{ error }` but is designed to be
 * called in a try/catch wrapper from the order-status hook so a loyalty failure
 * NEVER breaks the order update. Runs as the guest acting on their own account,
 * which the SECURITY DEFINER RPC permits.
 *
 * @param guestId  the order's guest_id
 * @param orderId  the order id (recorded as ref_id, ref_type='order')
 * @param total    the order's total_amount
 */
export async function awardOrderPointsAction(
  guestId: string,
  orderId: string,
  total: number
): Promise<{ balance: number | null; error: string | null }> {
  try {
    const points = pointsForOrderAmount(total)
    if (points <= 0) return { balance: null, error: null }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const { data, error } = await db.rpc('award_loyalty_points', {
      p_guest_id: guestId,
      p_points: points,
      p_reason: 'Order completed',
      p_ref_type: 'order',
      p_ref_id: orderId,
    })

    if (error) return { balance: null, error: error.message }
    return { balance: typeof data === 'number' ? data : null, error: null }
  } catch {
    return { balance: null, error: 'Unexpected error' }
  }
}

/**
 * Award the fixed check-in bonus to the current guest (or a guest derived from
 * the given stay). Exported for agent-04 to call at the check-in call site in
 * Wave 2 — the points logic lives here, the wiring lives there.
 *
 * EXACT SIGNATURE for agent-04 / Wave 2:
 *   awardCheckInBonusAction(stayId?: string): Promise<{ balance: number | null; error: string | null }>
 *
 * - With NO argument: awards to the currently authenticated guest (auth.uid()).
 * - With `stayId`: resolves the stay's guest_id (must belong to the caller's
 *   hotel; the RPC enforces same-hotel + role/self authorisation) and awards to
 *   that guest. Uses ref_type='checkin', ref_id=stayId when provided.
 */
export async function awardCheckInBonusAction(stayId?: string): Promise<{
  balance: number | null
  error: string | null
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { balance: null, error: 'Not authenticated' }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    let guestId = user.id
    let refId: string | null = null

    if (stayId) {
      const { data: stay, error: stayError } = await db
        .from('stays')
        .select('id, guest_id')
        .eq('id', stayId)
        .maybeSingle()

      if (stayError) return { balance: null, error: stayError.message }
      if (!stay) return { balance: null, error: 'Stay not found' }
      guestId = stay.guest_id
      refId = stay.id
    }

    const { data, error } = await db.rpc('award_loyalty_points', {
      p_guest_id: guestId,
      p_points: LOYALTY.checkInBonus,
      p_reason: 'Check-in bonus',
      p_ref_type: 'checkin',
      p_ref_id: refId,
    })

    if (error) return { balance: null, error: error.message }
    return { balance: typeof data === 'number' ? data : null, error: null }
  } catch {
    return { balance: null, error: 'Unexpected error' }
  }
}

/* -------------------------------------------------------------------------- */
/*  Admin offer CRUD                                                           */
/* -------------------------------------------------------------------------- */

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

export async function getLoyaltyOffersAdminAction(): Promise<{
  offers: LoyaltyOffer[]
  error?: string
}> {
  const ctx = await getAdminCtx()
  if (!ctx) return { offers: [], error: 'Unauthorized' }

  const { data, error } = await ctx.supabase
    .from('loyalty_offers')
    .select('*')
    .eq('hotel_id', ctx.hotelId)
    .order('created_at', { ascending: false })

  if (error) return { offers: [], error: error.message }
  return { offers: (data ?? []) as LoyaltyOffer[] }
}

export async function createLoyaltyOfferAction(data: {
  title: string
  description?: string | null
  points_cost: number
}): Promise<{ offer?: LoyaltyOffer; error?: string }> {
  const ctx = await getAdminCtx()
  if (!ctx) return { error: 'Unauthorized' }

  const cost = Math.floor(data.points_cost)
  if (!Number.isFinite(cost) || cost < 0) return { error: 'Points cost must be a non-negative integer' }
  if (!data.title.trim()) return { error: 'Title is required' }

  const { data: row, error } = await ctx.supabase
    .from('loyalty_offers')
    .insert({
      hotel_id: ctx.hotelId,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      points_cost: cost,
    } as any)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return { offer: row as LoyaltyOffer }
}

export async function updateLoyaltyOfferAction(
  id: string,
  data: {
    title: string
    description?: string | null
    points_cost: number
  }
): Promise<{ offer?: LoyaltyOffer; error?: string }> {
  const ctx = await getAdminCtx()
  if (!ctx) return { error: 'Unauthorized' }

  const cost = Math.floor(data.points_cost)
  if (!Number.isFinite(cost) || cost < 0) return { error: 'Points cost must be a non-negative integer' }
  if (!data.title.trim()) return { error: 'Title is required' }

  const { data: row, error } = await ctx.supabase
    .from('loyalty_offers')
    .update({
      title: data.title.trim(),
      description: data.description?.trim() || null,
      points_cost: cost,
    } as any)
    .eq('id', id)
    .eq('hotel_id', ctx.hotelId)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return { offer: row as LoyaltyOffer }
}

export async function toggleLoyaltyOfferAction(
  id: string,
  is_active: boolean
): Promise<{ error?: string }> {
  const ctx = await getAdminCtx()
  if (!ctx) return { error: 'Unauthorized' }

  const { error } = await ctx.supabase
    .from('loyalty_offers')
    .update({ is_active } as any)
    .eq('id', id)
    .eq('hotel_id', ctx.hotelId)

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return {}
}

export async function deleteLoyaltyOfferAction(id: string): Promise<{ error?: string }> {
  const ctx = await getAdminCtx()
  if (!ctx) return { error: 'Unauthorized' }

  const { error } = await ctx.supabase
    .from('loyalty_offers')
    .delete()
    .eq('id', id)
    .eq('hotel_id', ctx.hotelId)

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return {}
}
