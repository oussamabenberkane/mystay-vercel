import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

/**
 * Chargily Pay v2 webhook.
 *
 * Chargily POSTs an event to this endpoint with a `signature` header that is the
 * hex HMAC-SHA256 of the RAW request body, signed with the Chargily API secret
 * key. (Chargily signs webhooks with the API secret itself; we accept a dedicated
 * CHARGILY_WEBHOOK_SECRET override but fall back to CHARGILY_SECRET_KEY.)
 *
 * Event types: `checkout.paid`, `checkout.failed`, `checkout.canceled`.
 * The payload's `data` object is the checkout; `data.id` matches our stored
 * `payments.provider_ref`, and `data.metadata.order_id` carries the order.
 *
 * Server-only: uses the service-role admin client (bypasses RLS) — mirrors
 * src/app/api/push/route.ts. NEVER throws; always returns an HTTP status.
 *
 * NOTE (Wave 2 dependency): the middleware matcher must let `/api/*` bypass the
 * auth redirect, otherwise an unauthenticated webhook POST is redirected to
 * /login. Agent-01 owns that fix in its own worktree; in this worktree the route
 * is correct but unreachable until that merges.
 */

// Webhook signing secret: prefer a dedicated secret, else the API secret key.
const WEBHOOK_SECRET =
  process.env.CHARGILY_WEBHOOK_SECRET || process.env.CHARGILY_SECRET_KEY || ''

const webhookConfigured =
  !!WEBHOOK_SECRET &&
  !WEBHOOK_SECRET.startsWith('your_') &&
  !WEBHOOK_SECRET.startsWith('test_placeholder')

type ChargilyCheckout = {
  id?: string
  status?: string
  amount?: number
  metadata?: { order_id?: string; guest_id?: string; hotel_id?: string } | null
}

type ChargilyEvent = {
  id?: string
  type?: string
  data?: ChargilyCheckout
}

function getServiceDb() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  ) as any
}

/** Constant-time comparison of two hex signatures. */
function signaturesMatch(received: string, expected: string): boolean {
  try {
    const a = Buffer.from(received, 'hex')
    const b = Buffer.from(expected, 'hex')
    if (a.length !== b.length || a.length === 0) return false
    return crypto.timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  // Feature gate — without a signing secret we cannot trust any payload.
  if (!webhookConfigured) {
    return NextResponse.json(
      { error: 'Payments not configured' },
      { status: 503 }
    )
  }

  try {
    // RAW body is required to verify the signature (parsing would change bytes).
    const rawBody = await request.text()
    const signature = request.headers.get('signature') ?? ''

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
    }

    const expected = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(rawBody, 'utf8')
      .digest('hex')

    if (!signaturesMatch(signature, expected)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    let event: ChargilyEvent
    try {
      event = JSON.parse(rawBody) as ChargilyEvent
    } catch {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const type = event.type ?? ''
    const checkout = event.data
    const providerRef = checkout?.id

    // We only act on terminal checkout outcomes that reference a known checkout.
    if (!providerRef || !type.startsWith('checkout.')) {
      // Acknowledge so Chargily does not retry events we deliberately ignore.
      return NextResponse.json({ received: true })
    }

    const db = getServiceDb()

    // Match our payment row by provider_ref (the Chargily checkout id).
    const { data: payment } = await db
      .from('payments')
      .select('id, order_id, status')
      .eq('provider_ref', providerRef)
      .maybeSingle()

    if (!payment) {
      // Unknown checkout — ack to avoid endless retries.
      return NextResponse.json({ received: true })
    }

    // Idempotent / replay-safe: skip if already in a terminal state.
    if (payment.status === 'paid' || payment.status === 'refunded') {
      return NextResponse.json({ received: true })
    }

    let nextPaymentStatus: 'paid' | 'failed' | null = null
    let nextOrderStatus: 'paid' | 'unpaid' | null = null

    if (type === 'checkout.paid') {
      nextPaymentStatus = 'paid'
      nextOrderStatus = 'paid'
    } else if (type === 'checkout.failed' || type === 'checkout.canceled') {
      nextPaymentStatus = 'failed'
      nextOrderStatus = 'unpaid'
    }

    if (!nextPaymentStatus) {
      return NextResponse.json({ received: true })
    }

    // Update the payment row.
    await db
      .from('payments')
      .update({ status: nextPaymentStatus })
      .eq('id', payment.id)

    // Reconcile the related order's payment_status (prefer the stored order_id,
    // fall back to metadata.order_id from the event).
    const orderId = payment.order_id ?? checkout?.metadata?.order_id ?? null
    if (orderId && nextOrderStatus) {
      await db
        .from('orders')
        .update({ payment_status: nextOrderStatus })
        .eq('id', orderId)
    }

    return NextResponse.json({ received: true })
  } catch {
    // Never throw. A 500 lets Chargily retry later if something transient broke.
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
