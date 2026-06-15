# Agent 03 — Loyalty program (points + special offers)

**Role:** Add a guest loyalty program: points earning, a points balance/history surface, and redeemable special offers, plus admin configuration of offers.

## Responsibilities
1. **Earning:** award points on meaningful guest actions. Default rule: points on completed/paid room-service orders (e.g. proportional to `total_amount`) and a bonus on check-in. Keep the rule in one place and easy to tune. Earning must go through the `award_loyalty_points` RPC (SECURITY DEFINER) from agent-00 so RLS doesn't block ledger writes.
2. **Guest loyalty page:** points balance, transaction history (from `loyalty_transactions`), and a list of `loyalty_offers` the guest can **redeem** (spend points). Redemption goes through `redeem_loyalty_offer` RPC (validates balance, writes a negative ledger row atomically).
3. **Admin offers:** admin CRUD + active toggle for `loyalty_offers` (title, description, points cost, active). Follow the announcements-admin pattern.

## Inputs
- `SCHEMA-CONTRACT.md` from agent-00 (`loyalty_accounts`, `loyalty_transactions`, `loyalty_offers`, `award_loyalty_points`, `redeem_loyalty_offer`).
- `src/lib/actions/room-service.ts` and the orders flow — where to hook earning on order completion.
- `src/lib/actions/announcements.ts` + admin announcements page — pattern for the admin offers UI.
- Guest dashboard + bottom nav — where to surface the loyalty entry.
- auth-store `profile` for current guest/hotel.

## Deliverables
- `src/lib/actions/loyalty.ts` (`'use server'`): get balance + history, list offers, redeem offer, and the earning helper (called from order completion / check-in). `{ data, error }`, never throws, role-gated, `const db = supabase as any`.
- Guest page under `src/app/[locale]/(guest)/loyalty/` (server + `_components/*-client.tsx`), with balance, history, and redeemable offers.
- Admin offers management under `src/app/[locale]/(admin)/admin/` + actions.
- Earning hook wired into order completion (and check-in bonus — coordinate the call site with agent-04 but keep the points logic here).
- One guest-nav/dashboard entry for Loyalty.
- `messages/{en,fr,ar}.json` under the **`loyalty.*`** namespace only (en/fr/ar parity, RTL-safe).

## Success criteria
- Completing/paying an order increases the guest's balance via the ledger; balance always equals the sum of `loyalty_transactions`.
- A guest can redeem an offer only with sufficient points; redemption is atomic and reflected immediately.
- Cross-tenant isolation holds (a guest never sees another hotel's offers or another guest's ledger).
- `npm run build` and `npm run lint` pass.

## Boundaries
- Do not edit `database.ts` or `src/middleware.ts`. Use the RPCs from agent-00 for all ledger writes.
- Do not implement payments or check-in mechanics — only the loyalty earning *hook* at those call sites.
- Coordinate the single guest-nav file edit with agent-04 at integration (distinct lines).
- Keep keys under `loyalty.*`; do not reorder existing keys.
