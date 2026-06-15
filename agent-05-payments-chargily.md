# Agent 05 — Card payment via app (Chargily) vs at reception

**Role:** Let guests choose to **pay by card in the app** or **pay at reception**, and implement in-app card payment through **Chargily** (Algeria — CIB / Edahabia via SATIM). Currency DZD.

## Context (locked decision)
- Provider is **Chargily Pay** (hosted checkout + webhook callback). The guest must always have the explicit choice: *pay via app* or *pay at reception*. "Reception" simply records the intent; no charge is taken in-app.

## Responsibilities
1. **Payment choice UI** on the orders/expenses surface: per order (or per bill) let the guest pick `app_card` or `reception`.
2. **Chargily checkout (app_card):** create a Chargily checkout (server-side, secret key from env), persist a `payments` row (`status='pending'`, store `checkout_url` + `provider_ref`), and redirect the guest to the hosted checkout.
3. **Webhook:** add an API route to receive Chargily callbacks, **verify the signature**, and update the `payments` row + the related `orders.payment_status` to `paid`/`failed`. Use the **service-role** admin client in the webhook (no user session there) — mirror the existing `/api/push` route's server-only pattern. Never expose the secret key client-side.
4. **Reflect status:** show payment status (unpaid / pending / paid, and method) on the guest expenses page and to staff/admin.

## Inputs
- `SCHEMA-CONTRACT.md` from agent-00 (`payments` table, `orders.payment_status` / `payment_method`, currency DZD).
- `src/app/[locale]/(guest)/expenses/page.tsx` — current read-only settlement view ("charges added to room bill, settled at check-out").
- `src/lib/actions/room-service.ts` (orders) for order/amount context.
- `src/app/api/push/route.ts` and `src/lib/supabase/admin.ts` — pattern for a server-only API route using the service-role client.
- Env: add `CHARGILY_SECRET_KEY`, `CHARGILY_WEBHOOK_SECRET` (and public base URL for success/callback). These are **not committed**; document them in the deliverable notes for the user to set. Read Chargily Pay's current API for the exact endpoint/signature scheme.

## Deliverables
- `src/lib/actions/payments.ts` (`'use server'`): set payment method (`reception` records intent; `app_card` creates a Chargily checkout and returns `checkout_url`). `{ data, error }`, never throws, role-gated.
- `src/app/api/payments/chargily/route.ts` (or similar): signed webhook handler using the admin client; idempotent; never throws; updates `payments` + `orders`.
- Guest payment-choice + checkout UI in the expenses/orders area; status display for guest and staff/admin.
- A short note listing required env vars and the Chargily dashboard webhook URL to configure.
- `messages/{en,fr,ar}.json` under the **`payment.*`** namespace only (en/fr/ar parity, RTL-safe).

## Success criteria
- Guest can choose `reception` (recorded, no charge) or `app_card` (redirected to a working Chargily checkout).
- On a successful Chargily callback the `payments` row and `orders.payment_status` flip to `paid`; failures are recorded and surfaced; webhook signature is verified and replay-safe (idempotent).
- Secret keys never reach the client; webhook uses the service-role client only.
- Graceful behavior when env vars are absent (feature disabled, no crash) — mirror how push is gated by `vapidConfigured`.
- `npm run build` and `npm run lint` pass.

## Boundaries
- Do not edit `database.ts` or `src/middleware.ts` (the webhook route is excluded from auth redirects by being under `/api`; confirm middleware matcher already skips it — do not add redirect logic for it).
- Do not implement check-in/out mechanics (agent-04). You may *read* check-out state but settlement logic lives here.
- Keep keys under `payment.*`; do not reorder existing keys.
