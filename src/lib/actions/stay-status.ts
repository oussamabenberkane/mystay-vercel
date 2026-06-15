'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * In-app check-in / check-out (agent-04).
 *
 * App-level status + timestamps ONLY — no payment/settlement logic (agent-05).
 *
 * Status handling follows SCHEMA-CONTRACT.md §3:
 *  - Live flows (ordering RLS, get_active_stay(), get_hotel_stats()) key off
 *    status = 'active'. So when a guest CHECKS IN we keep status = 'active'
 *    (the operative live status) and stamp checked_in_at — we do NOT rename to
 *    'checked_in', which would hide the stay from those flows.
 *  - When a guest CHECKS OUT we stamp checked_out_at and move status to
 *    'checked_out'.
 *  - 'reserved' = stay created but guest not yet checked in.
 */

export type StayStatus =
  | 'active'
  | 'archived'
  | 'reserved'
  | 'checked_in'
  | 'checked_out'

export type GuestStay = {
  id: string
  hotel_id: string
  status: StayStatus
  check_in: string
  check_out: string
  checked_in_at: string | null
  checked_out_at: string | null
  room_number: string | null
  room_type: string | null
}

// A stay counts as "live / in-house" when it is active or checked_in.
const LIVE_STATUSES: StayStatus[] = ['active', 'checked_in']
// A stay is "done" when it has been checked out or archived.
const DONE_STATUSES: StayStatus[] = ['checked_out', 'archived']

type StayRow = {
  id: string
  hotel_id: string
  guest_id: string
  status: StayStatus
  check_in: string
  check_out: string
  checked_in_at: string | null
  checked_out_at: string | null
  rooms: { number: string; type: string } | { number: string; type: string }[] | null
}

function mapStay(row: StayRow): GuestStay {
  const room = Array.isArray(row.rooms) ? row.rooms[0] ?? null : row.rooms
  return {
    id: row.id,
    hotel_id: row.hotel_id,
    status: row.status,
    check_in: row.check_in,
    check_out: row.check_out,
    checked_in_at: row.checked_in_at,
    checked_out_at: row.checked_out_at,
    room_number: room?.number ?? null,
    room_type: room?.type ?? null,
  }
}

/**
 * Returns the guest's most relevant stay for the check-in/out card.
 * Priority: a live (active/checked_in) stay, else a reserved stay, else the
 * most recent stay of any status. Returns null only when the guest has no stay.
 */
export async function getStayStatusAction(): Promise<{
  stay: GuestStay | null
  error: string | null
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { stay: null, error: 'Not authenticated' }

    const { data, error } = await supabase
      .from('stays')
      .select(
        'id, hotel_id, guest_id, status, check_in, check_out, checked_in_at, checked_out_at, rooms(number, type)'
      )
      .eq('guest_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return { stay: null, error: error.message }

    const rows = ((data ?? []) as unknown) as StayRow[]
    if (rows.length === 0) return { stay: null, error: null }

    const live = rows.find((s) => LIVE_STATUSES.includes(s.status))
    const reserved = rows.find((s) => s.status === 'reserved')
    const chosen = live ?? reserved ?? rows[0]

    return { stay: mapStay(chosen), error: null }
  } catch {
    return { stay: null, error: 'Unexpected error' }
  }
}

/**
 * Check the current guest in.
 * Valid only when the stay belongs to the guest and has not been checked in yet
 * (no checked_in_at) and is not already checked out. Keeps status = 'active'
 * (the live status) and stamps checked_in_at.
 */
export async function checkInAction(
  stayId: string
): Promise<{ data: GuestStay | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: 'Not authenticated' }

    const { data: stayData, error: fetchError } = await supabase
      .from('stays')
      .select('id, status, checked_in_at, checked_out_at')
      .eq('id', stayId)
      .eq('guest_id', user.id)
      .maybeSingle()

    if (fetchError) return { data: null, error: fetchError.message }
    const stay = stayData as
      | { id: string; status: StayStatus; checked_in_at: string | null; checked_out_at: string | null }
      | null
    if (!stay) return { data: null, error: 'Stay not found' }

    // Invalid transition guards.
    if (DONE_STATUSES.includes(stay.status) || stay.checked_out_at) {
      return { data: null, error: 'This stay has already been checked out' }
    }
    if (stay.checked_in_at) {
      return { data: null, error: 'You are already checked in' }
    }

    const { error: updateError } = await supabase
      .from('stays')
      .update({
        status: 'active',
        checked_in_at: new Date().toISOString(),
      })
      .eq('id', stayId)
      .eq('guest_id', user.id)

    if (updateError) return { data: null, error: updateError.message }

    // WAVE 2: await awardCheckInBonusAction(stayId) from '@/lib/actions/loyalty' (agent-03)
    // Fire the loyalty check-in bonus here on success. That helper lives in a
    // separate worktree and is intentionally NOT imported yet (would break this build).

    revalidatePath('/', 'layout')

    const refreshed = await getStayStatusAction()
    return { data: refreshed.stay, error: null }
  } catch {
    return { data: null, error: 'Unexpected error' }
  }
}

/**
 * Check the current guest out.
 * Valid only when the stay belongs to the guest, is currently live
 * (active/checked_in or has checked_in_at), and is not already checked out.
 * Stamps checked_out_at and moves status to 'checked_out'.
 */
export async function checkOutAction(
  stayId: string
): Promise<{ data: GuestStay | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: 'Not authenticated' }

    const { data: stayData, error: fetchError } = await supabase
      .from('stays')
      .select('id, status, checked_in_at, checked_out_at')
      .eq('id', stayId)
      .eq('guest_id', user.id)
      .maybeSingle()

    if (fetchError) return { data: null, error: fetchError.message }
    const stay = stayData as
      | { id: string; status: StayStatus; checked_in_at: string | null; checked_out_at: string | null }
      | null
    if (!stay) return { data: null, error: 'Stay not found' }

    // Invalid transition guards.
    if (DONE_STATUSES.includes(stay.status) || stay.checked_out_at) {
      return { data: null, error: 'You are already checked out' }
    }
    const isLive = LIVE_STATUSES.includes(stay.status) || !!stay.checked_in_at
    if (!isLive) {
      return { data: null, error: 'You must check in before checking out' }
    }

    const { error: updateError } = await supabase
      .from('stays')
      .update({
        status: 'checked_out',
        checked_out_at: new Date().toISOString(),
      })
      .eq('id', stayId)
      .eq('guest_id', user.id)

    if (updateError) return { data: null, error: updateError.message }

    revalidatePath('/', 'layout')

    const refreshed = await getStayStatusAction()
    return { data: refreshed.stay, error: null }
  } catch {
    return { data: null, error: 'Unexpected error' }
  }
}
