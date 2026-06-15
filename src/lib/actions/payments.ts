'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Payments — Chargily Pay v2 (Algeria, DZD via CIB / Edahabia / SATIM).
 *
 * Guests choose between:
 *  - `app_card`  → create a Chargily hosted checkout, persist a `payments` row
 *                  (status='pending'), and return its `checkout_url` to redirect to.
 *  - `reception` → record the intent only; no charge is taken in-app.
 *
 * The whole card flow is gated on `chargilyConfigured` (mirrors how push is gated
 * on `vapidConfigured`). When the secret key is missing / a placeholder, `app_card`
 * returns a graceful `{ error }` and the UI hides the card option — no crash.
 *
 * The webhook (src/app/api/payments/chargily/route.ts) reconciles status using the
 * service-role admin client; this file performs only RLS-safe, session-scoped work.
 */

const CHARGILY_BASE_URL =
  process.env.CHARGILY_MODE === 'live'
    ? 'https://pay.chargily.net/api/v2'
    : 'https://pay.chargily.net/test/api/v2'

/** Feature flag — true only when a real Chargily secret key is present. */
export const chargilyConfigured =
  !!process.env.CHARGILY_SECRET_KEY &&
  !process.env.CHARGILY_SECRET_KEY.startsWith('your_') &&
  !process.env.CHARGILY_SECRET_KEY.startsWith('test_placeholder')

/** Exposed to client components so the card option can be hidden when unconfigured. */
export async function isChargilyConfigured(): Promise<boolean> {
  return chargilyConfigured
}

type PaymentRow = {
  id: string
  order_id: string | null
  amount: number
  currency: string
  method: 'app_card' | 'reception'
  provider: string
  provider_ref: string | null
  status: 'pending' | 'paid' | 'failed' | 'refunded'
  checkout_url: string | null
  created_at: string
  updated_at: string
}

function appBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return raw.replace(/\/+$/, '')
}

/**
 * Record "pay at reception" intent for an order.
 * Sets orders.payment_method='reception' and leaves payment_status='unpaid'
 * (no charge). Also writes a `payments` row (method='reception', status='pending')
 * so staff can later mark it paid at the desk.
 */
export async function chooseReceptionPaymentAction(
  orderId: string
): Promise<{ data: { method: 'reception' } | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: 'Not authenticated' }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const { data: profile } = await db
      .from('profiles')
      .select('role, hotel_id')
      .eq('id', user.id)
      .single()
    if (!profile || profile.role !== 'client') {
      return { data: null, error: 'Unauthorized' }
    }

    // Order must belong to this guest (RLS also enforces this on the update).
    const { data: order } = await db
      .from('orders')
      .select('id, hotel_id, stay_id, guest_id, total_amount, payment_status')
      .eq('id', orderId)
      .eq('guest_id', user.id)
      .single()
    if (!order) return { data: null, error: 'Order not found' }
    if (order.payment_status === 'paid') {
      return { data: null, error: 'Order is already paid' }
    }

    const { error: updErr } = await db
      .from('orders')
      .update({ payment_method: 'reception', payment_status: 'unpaid' })
      .eq('id', orderId)
      .eq('guest_id', user.id)
    if (updErr) return { data: null, error: 'Failed to record payment choice' }

    // Best-effort ledger row; not fatal if it fails (RLS client-insert requires a
    // live stay — the order having a stay_id guarantees that).
    await db.from('payments').insert({
      hotel_id: order.hotel_id,
      guest_id: user.id,
      stay_id: order.stay_id,
      order_id: order.id,
      amount: order.total_amount,
      currency: 'DZD',
      method: 'reception',
      provider: 'chargily',
      status: 'pending',
    })

    return { data: { method: 'reception' }, error: null }
  } catch {
    return { data: null, error: 'Unexpected error' }
  }
}

/**
 * Start an in-app card payment for an order via Chargily hosted checkout.
 * Creates the checkout server-side (secret key never leaves the server),
 * persists a `payments` row with the returned checkout_url + provider_ref,
 * marks the order payment_status='pending' / payment_method='app_card',
 * and returns the checkout_url for the client to redirect to.
 */
export async function startCardPaymentAction(
  orderId: string
): Promise<{ data: { checkoutUrl: string } | null; error: string | null }> {
  try {
    if (!chargilyConfigured) {
      return { data: null, error: 'Card payment is not available' }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: 'Not authenticated' }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const { data: profile } = await db
      .from('profiles')
      .select('role, hotel_id')
      .eq('id', user.id)
      .single()
    if (!profile || profile.role !== 'client') {
      return { data: null, error: 'Unauthorized' }
    }

    const { data: order } = await db
      .from('orders')
      .select('id, hotel_id, stay_id, guest_id, total_amount, payment_status')
      .eq('id', orderId)
      .eq('guest_id', user.id)
      .single()
    if (!order) return { data: null, error: 'Order not found' }
    if (order.payment_status === 'paid') {
      return { data: null, error: 'Order is already paid' }
    }

    // Chargily amount is an integer in DZD (DZD has no minor unit).
    const amount = Math.round(Number(order.total_amount))
    if (!amount || amount < 1) {
      return { data: null, error: 'Invalid amount' }
    }

    const base = appBaseUrl()

    // Create the checkout. Chargily v2:
    //   POST {base}/checkouts
    //   Authorization: Bearer <CHARGILY_SECRET_KEY>
    //   body: amount (int), currency:"dzd", success_url, failure_url,
    //         webhook_endpoint, description, metadata
    let res: Response
    try {
      res = await fetch(`${CHARGILY_BASE_URL}/checkouts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.CHARGILY_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          currency: 'dzd',
          success_url: `${base}/expenses?payment=success&order=${order.id}`,
          failure_url: `${base}/expenses?payment=failed&order=${order.id}`,
          webhook_endpoint: `${base}/api/payments/chargily`,
          description: `Order ${String(order.id).slice(-8).toUpperCase()}`,
          metadata: { order_id: order.id, guest_id: user.id, hotel_id: order.hotel_id },
        }),
      })
    } catch {
      return { data: null, error: 'Payment provider unreachable' }
    }

    if (!res.ok) {
      return { data: null, error: 'Failed to create checkout' }
    }

    const checkout = (await res.json()) as {
      id?: string
      checkout_url?: string
      status?: string
    }
    if (!checkout?.checkout_url || !checkout?.id) {
      return { data: null, error: 'Invalid checkout response' }
    }

    // Persist the pending payment (client-insert RLS: own guest_id + live stay).
    const { error: insErr } = await db.from('payments').insert({
      hotel_id: order.hotel_id,
      guest_id: user.id,
      stay_id: order.stay_id,
      order_id: order.id,
      amount,
      currency: 'DZD',
      method: 'app_card',
      provider: 'chargily',
      provider_ref: checkout.id,
      status: 'pending',
      checkout_url: checkout.checkout_url,
    })
    if (insErr) {
      // Could not persist — do not strand a charge with no local record.
      return { data: null, error: 'Failed to record payment' }
    }

    // Reflect pending state on the order so the UI updates immediately.
    await db
      .from('orders')
      .update({ payment_method: 'app_card', payment_status: 'pending' })
      .eq('id', orderId)
      .eq('guest_id', user.id)

    return { data: { checkoutUrl: checkout.checkout_url }, error: null }
  } catch {
    return { data: null, error: 'Unexpected error' }
  }
}

/** Guest reads their own payments (RLS: guest_id = auth.uid()). */
export async function getMyPaymentsAction(): Promise<{
  payments: PaymentRow[]
  error: string | null
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { payments: [], error: 'Not authenticated' }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const { data, error } = await db
      .from('payments')
      .select(
        'id, order_id, amount, currency, method, provider, provider_ref, status, checkout_url, created_at, updated_at'
      )
      .eq('guest_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return { payments: [], error: error.message }
    return { payments: (data ?? []) as PaymentRow[], error: null }
  } catch {
    return { payments: [], error: 'Unexpected error' }
  }
}

/** Staff/admin read payments for their hotel (RLS: hotel-scoped). */
export async function getHotelPaymentsAction(): Promise<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payments: any[]
  error: string | null
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { payments: [], error: 'Not authenticated' }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const { data: profile } = await db
      .from('profiles')
      .select('role, hotel_id')
      .eq('id', user.id)
      .single()
    if (!profile || !['staff', 'admin'].includes(profile.role)) {
      return { payments: [], error: 'Unauthorized' }
    }

    const { data, error } = await db
      .from('payments')
      .select(
        'id, order_id, guest_id, amount, currency, method, provider, status, created_at, updated_at, profiles(full_name)'
      )
      .eq('hotel_id', profile.hotel_id)
      .order('created_at', { ascending: false })

    if (error) return { payments: [], error: error.message }
    return { payments: data ?? [], error: null }
  } catch {
    return { payments: [], error: 'Unexpected error' }
  }
}

/**
 * Staff/admin marks a `reception` payment as paid at the desk.
 * Updates both the payments row and the related order's payment_status.
 */
export async function markReceptionPaidAction(
  orderId: string
): Promise<{ data: { status: 'paid' } | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: 'Not authenticated' }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const { data: profile } = await db
      .from('profiles')
      .select('role, hotel_id')
      .eq('id', user.id)
      .single()
    if (!profile || !['staff', 'admin'].includes(profile.role)) {
      return { data: null, error: 'Unauthorized' }
    }

    const { data: order, error: updErr } = await db
      .from('orders')
      .update({ payment_status: 'paid' })
      .eq('id', orderId)
      .eq('hotel_id', profile.hotel_id)
      .select('id')
      .single()
    if (updErr || !order) return { data: null, error: 'Failed to update order' }

    // Flip the matching reception payment row(s) to paid (best-effort).
    await db
      .from('payments')
      .update({ status: 'paid' })
      .eq('order_id', orderId)
      .eq('hotel_id', profile.hotel_id)
      .eq('method', 'reception')
      .neq('status', 'paid')

    return { data: { status: 'paid' }, error: null }
  } catch {
    return { data: null, error: 'Unexpected error' }
  }
}
