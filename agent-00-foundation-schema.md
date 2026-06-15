# Agent 00 — Foundation: DB schema, RLS, types

**Role:** Database foundation. You run **first and alone**; every feature agent (01–05) builds on the contract you publish. Get the schema right and stable.

## Responsibilities
Design and apply all new schema needed by the enhancement plan, with RLS, and publish a single **schema contract** doc the other agents read.

New schema to define (live Supabase DB is the source of truth; also write migration files under `supabase/migrations/`):

1. **Landing / promo CMS** (consumed by agents 01/02):
   - `ad_banners` — id, hotel_id (nullable for global), image_url, title, link_url, sort_order, is_active, created_at.
   - `flash_sales` — id, hotel_id (nullable), title, description, image_url, discount_label, starts_at (timestamptz), ends_at (timestamptz), is_active, sort_order, created_at.
   - `showcase_hotels` — id, name, image_url, location, indicative_price, rating (numeric), sort_order, is_active, created_at. (Pure marketing content — **not** the tenant `hotels` table.)
2. **Loyalty** (agent 03):
   - `loyalty_accounts` — id, guest_id (unique), hotel_id, points_balance int, created_at, updated_at.
   - `loyalty_transactions` — id, account_id, hotel_id, delta int, reason text, ref_type, ref_id, created_at (ledger; balance = sum).
   - `loyalty_offers` — id, hotel_id, title, description, points_cost int, is_active, created_at.
3. **Check-in / check-out** (agent 04): add to `stays` — `checked_in_at timestamptz null`, `checked_out_at timestamptz null`, and extend `status` to include `reserved | checked_in | checked_out` alongside existing `active | archived` (decide a clean enum/text-constraint that doesn't break current rows; document the mapping).
4. **Payments** (agent 05):
   - `payments` — id, hotel_id, guest_id, stay_id, order_id (nullable), amount, currency default 'DZD', method (`app_card | reception`), provider (`chargily`), provider_ref, status (`pending | paid | failed | refunded`), checkout_url, created_at, updated_at.
   - Add to `orders` (and reflect through the `expenses` view): `payment_status (unpaid | pending | paid)` and `payment_method (app_card | reception | null)`.

## Inputs
- `supabase/migrations/` (001–005) — existing schema and conventions.
- `src/lib/types/database.ts` — current generated types.
- `supabase/migrations/002_rls_policies.sql` — RLS model: `get_my_hotel_id()`, `get_my_role()` SECURITY DEFINER helpers.
- Supabase coords are in project memory (mystay ref `iewxxozfyknuyhhfuapf`).

## Deliverables
1. Migration file(s) for all tables/columns/views above (idempotent where reasonable).
2. **RLS policies** for every new table, following the existing pattern: clients touch only their own rows for their active stay; staff/admin scoped to their hotel. `ad_banners`/`flash_sales`/`showcase_hotels` need **public (anon) read** for the pre-login landing — this is the one deliberate exception; make it read-only and is_active-filtered.
3. Any needed RPCs (e.g. `award_loyalty_points`, `redeem_loyalty_offer`) as SECURITY DEFINER if RLS would otherwise block legitimate writes.
4. Updated `src/lib/types/database.ts` for the **core** additions (stays columns, orders columns). New satellite tables may stay untyped — feature agents use `const db = supabase as any` per repo convention.
5. **`SCHEMA-CONTRACT.md`** in project root: every new table/column/RPC with exact names, types, enum values, RLS summary, and the public-read exception. This is the interface agents 01–05 code against — be precise.

## Success criteria
- Migrations apply cleanly on the live DB with no break to existing rows; `status` change is backward-compatible.
- Anon can `select` active landing content and nothing else; cross-tenant isolation holds for all new tables (spot-check with the RLS helpers).
- `npm run build` and `npm run lint` pass.
- `SCHEMA-CONTRACT.md` is complete enough that agents 01–05 never need to ask you about a column.

## Boundaries
- You own all schema, RLS, RPCs, and `database.ts`. No other agent edits these.
- Do not build UI or feature server actions — only schema, policies, RPCs, types, and the contract doc.
