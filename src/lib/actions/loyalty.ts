'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { LOYALTY, pointsForOrderAmount } from '@/lib/loyalty/config'

// Earning rules (LOYALTY config + pointsForOrderAmount) live in the single
// tunable place: src/lib/loyalty/config.ts (a 'use server' file may only export
// async functions, so the config/rule logic is kept there and imported here).

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
 * its `total_amount`.
 *
 * Security: the amount and recipient are derived from the authoritative `orders`
 * row server-side (never from a client-supplied argument), points are only
 * credited when the order is actually `delivered`, and the award RPC is
 * idempotent per order id — so this is safe even though it is an exported
 * (client-callable) server action. Crediting goes through the service-role
 * client because the RPC is now restricted to the trusted server only.
 *
 * Best-effort: returns `{ error }` and never throws, so a loyalty failure never
 * breaks the order-status update that calls it.
 *
 * @param orderId  the order id (recorded as ref_id, ref_type='order')
 */
export async function awardOrderPointsAction(
  orderId: string
): Promise<{ balance: number | null; error: string | null }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adb = createAdminClient() as any

    const { data: order, error: orderError } = await adb
      .from('orders')
      .select('guest_id, total_amount, status')
      .eq('id', orderId)
      .maybeSingle()

    if (orderError) return { balance: null, error: orderError.message }
    if (!order || order.status !== 'delivered') return { balance: null, error: null }

    const points = pointsForOrderAmount(Number(order.total_amount ?? 0))
    if (points <= 0) return { balance: null, error: null }

    const { data, error } = await adb.rpc('award_loyalty_points', {
      p_guest_id: order.guest_id,
      p_points: points,
      p_reason: 'Order completed',
      p_ref_type: 'order',
      p_ref_id: orderId,
    })

    if (error) return { balance: null, error: error.message }
    return { balance: typeof data === 'number' ? data : null, error: null }
  } catch (e) {
    // Surface the real reason (e.g. a misconfigured service-role key thrown by
    // createAdminClient) instead of swallowing it behind a generic message.
    return { balance: null, error: e instanceof Error ? e.message : 'Unexpected error' }
  }
}

/**
 * Award the fixed check-in bonus for the current guest's checked-in stay.
 * Called from the guest check-in action (stay-status.ts) right after check-in.
 *
 * Security: the bonus is only credited for a stay that belongs to the caller
 * (`guest_id = auth.uid()`) and is genuinely checked in (`checked_in_at` set);
 * the amount is a fixed server constant; and the award RPC is idempotent per
 * stay id, so the bonus can be earned at most once per stay (no farming).
 * Crediting goes through the service-role client (the RPC is server-only now).
 *
 * @param stayId  optional — the stay being checked in. When omitted, the
 *                caller's most recent checked-in stay is used. Recorded as
 *                ref_id with ref_type='checkin'.
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
    const adb = createAdminClient() as any

    // Only the caller's own, genuinely checked-in stay qualifies.
    let query = adb
      .from('stays')
      .select('id, guest_id, checked_in_at')
      .eq('guest_id', user.id)
      .not('checked_in_at', 'is', null)
    if (stayId) query = query.eq('id', stayId)

    const { data: stay, error: stayError } = await query.maybeSingle()
    if (stayError) return { balance: null, error: stayError.message }
    if (!stay || !stay.checked_in_at) return { balance: null, error: null }

    const { data, error } = await adb.rpc('award_loyalty_points', {
      p_guest_id: stay.guest_id,
      p_points: LOYALTY.checkInBonus,
      p_reason: 'Check-in bonus',
      p_ref_type: 'checkin',
      p_ref_id: stay.id,
    })

    if (error) return { balance: null, error: error.message }
    return { balance: typeof data === 'number' ? data : null, error: null }
  } catch (e) {
    return { balance: null, error: e instanceof Error ? e.message : 'Unexpected error' }
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
