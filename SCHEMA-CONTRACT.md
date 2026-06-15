# SCHEMA-CONTRACT.md — frozen interface for agents 01–05

Produced by **agent-00**. This is the single source of truth for every new table, column, and RPC added by the enhancement plan. Code against the exact names, types, allowed values, defaults, and nullability below. If something here is ambiguous, prefer this document.

**General conventions (unchanged from the existing schema):**
- Every tenant-scoped row carries `hotel_id uuid` and is isolated by RLS via the two `SECURITY DEFINER` helpers `get_my_hotel_id()` and `get_my_role()`.
- New satellite tables are **NOT typed** in `src/lib/types/database.ts`. Follow the repo convention `const db = supabase as any` for them. Only the **core** additions (new `stays` columns, new `orders` columns, new `expenses` view columns) are typed.
- All timestamps are `timestamptz`, serialised as ISO strings on the client.
- Server actions never throw — return `{ data, error }`.

Migration files (**applied to the live DB** on 2026-06-15, ref `iewxxozfyknuyhhfuapf`):
- `006_cms_landing.sql` — ad_banners, flash_sales, showcase_hotels + RLS (incl. anon read).
- `007_loyalty.sql` — loyalty_accounts, loyalty_transactions, loyalty_offers + RLS + 2 RPCs.
- `008_stays_checkin.sql` — stays check-in/out columns + widened status constraint.
- `009_payments.sql` — payments table + orders payment columns + expenses view re-create + RLS.

---

## 1. Landing / promo CMS (agents 01 render, 02 admin)

### `ad_banners`
| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |
| `hotel_id` | uuid | **yes** | — | FK `hotels(id)` ON DELETE CASCADE. **NULL = global banner** (shown on landing for all). |
| `image_url` | text | no | — | required |
| `title` | text | yes | — | |
| `link_url` | text | yes | — | |
| `sort_order` | integer | no | `0` | ascending |
| `is_active` | boolean | no | `true` | anon read is filtered to `is_active = true` |
| `created_at` | timestamptz | no | `now()` | |

### `flash_sales`
| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |
| `hotel_id` | uuid | **yes** | — | FK `hotels(id)` CASCADE. NULL = global. |
| `title` | text | no | — | required |
| `description` | text | yes | — | |
| `image_url` | text | yes | — | |
| `discount_label` | text | yes | — | e.g. "-30%" |
| `starts_at` | timestamptz | yes | — | countdown start |
| `ends_at` | timestamptz | yes | — | countdown end (timer) |
| `is_active` | boolean | no | `true` | |
| `sort_order` | integer | no | `0` | |
| `created_at` | timestamptz | no | `now()` | |

> Note: `is_active` gates anon read. The starts_at/ends_at window is **not** enforced by RLS — the UI decides whether to show/expire a sale based on the timestamps.

### `showcase_hotels` (pure marketing — **NOT** the tenant `hotels` table; has no `hotel_id`, no tenancy)
| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |
| `name` | text | no | — | required |
| `image_url` | text | yes | — | |
| `location` | text | yes | — | |
| `indicative_price` | numeric(10,2) | yes | — | display-only price |
| `rating` | numeric(2,1) | yes | — | 0.0–9.9 (one decimal); use e.g. 4.5 |
| `sort_order` | integer | no | `0` | |
| `is_active` | boolean | no | `true` | |
| `created_at` | timestamptz | no | `now()` | |

### RLS — CMS (the one anon-read exception)
- **anon SELECT:** allowed on all three tables, **filtered to `is_active = true`**. This is the *only* anon-readable content in the entire schema; it powers the pre-login splash/landing.
- **authenticated SELECT:** `ad_banners`/`flash_sales` → rows where `hotel_id IS NULL OR hotel_id = get_my_hotel_id()`. `showcase_hotels` → all rows.
- **INSERT/UPDATE/DELETE:** `ad_banners`/`flash_sales` → admin of the row's hotel (`hotel_id = get_my_hotel_id() AND get_my_role() = 'admin'`). `showcase_hotels` → any admin (`get_my_role() = 'admin'`).
- **Global rows** (`hotel_id IS NULL` on banners/sales) and **showcase_hotels** are not insertable by a tenant admin via RLS in a way that targets *another* hotel; for app-wide/global content, agent-02 should manage via the **service-role admin client** (`src/lib/supabase/admin.ts`), which bypasses RLS. Per-hotel banners/sales are fully manageable by that hotel's admin under RLS.

---

## 2. Loyalty (agent 03)

### `loyalty_accounts`
| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |
| `guest_id` | uuid | no | — | **UNIQUE**, FK `profiles(id)` CASCADE. One account per guest. |
| `hotel_id` | uuid | no | — | FK `hotels(id)` CASCADE |
| `points_balance` | integer | no | `0` | cached running total; **CHECK >= 0**. Mutate ONLY via the RPCs. |
| `created_at` | timestamptz | no | `now()` | |
| `updated_at` | timestamptz | no | `now()` | auto-updated by trigger |

### `loyalty_transactions` (ledger — balance = SUM(delta))
| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |
| `account_id` | uuid | no | — | FK `loyalty_accounts(id)` CASCADE |
| `hotel_id` | uuid | no | — | FK `hotels(id)` CASCADE |
| `delta` | integer | no | — | **positive = earn, negative = redeem** |
| `reason` | text | yes | — | free text |
| `ref_type` | text | yes | — | e.g. `'order'`, `'offer'`, `'manual'` |
| `ref_id` | uuid | yes | — | id of the referenced object |
| `created_at` | timestamptz | no | `now()` | |

### `loyalty_offers`
| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |
| `hotel_id` | uuid | no | — | FK `hotels(id)` CASCADE |
| `title` | text | no | — | required |
| `description` | text | yes | — | |
| `points_cost` | integer | no | — | **CHECK >= 0** |
| `is_active` | boolean | no | `true` | clients see active only |
| `created_at` | timestamptz | no | `now()` | |

### RLS — loyalty
- `loyalty_accounts` SELECT: client → own account (`guest_id = auth.uid()`); staff/admin → any account in their hotel. INSERT/UPDATE: admin of the hotel only (or via the RPCs).
- `loyalty_transactions` SELECT: client → own account's ledger; staff/admin → all in their hotel. INSERT: admin of the hotel (direct) **or via the RPCs** (preferred).
- `loyalty_offers` SELECT: client → active offers in their hotel; staff/admin → all offers in their hotel. INSERT/UPDATE/DELETE: admin of the hotel.
- **Balances must be changed through the RPCs**, not by writing `loyalty_transactions` and `points_balance` separately — the RPCs keep them atomic and consistent.

### RPCs — loyalty (SECURITY DEFINER, granted to `authenticated`)

**`award_loyalty_points(p_guest_id uuid, p_points integer, p_reason text DEFAULT NULL, p_ref_type text DEFAULT NULL, p_ref_id uuid DEFAULT NULL) RETURNS integer`**
- Credits `p_points` to the guest. **Lazily creates** the `loyalty_account` if missing. Inserts a positive ledger row and increments the cached balance atomically.
- Returns the **new `points_balance`** (integer).
- Authorisation: caller must be in the **same hotel** as the guest, and be **staff/admin** OR the **guest acting on their own account** (`auth.uid() = p_guest_id`) — supports an order-completion earn hook running as the client.
- Raises (action should catch and surface as `error`): `'points must be a positive integer'`, `'guest profile not found'`, `'not authorised: hotel mismatch'`, `'not authorised: insufficient role'`.
- Call: `supabase.rpc('award_loyalty_points', { p_guest_id, p_points, p_reason, p_ref_type, p_ref_id })`.

**`redeem_loyalty_offer(p_offer_id uuid) RETURNS integer`**
- Caller is the guest (`auth.uid()`). Validates the offer exists, belongs to the guest's hotel, and `is_active`; then checks the account balance covers `points_cost`; writes a negative ledger row (`delta = -points_cost`, `ref_type='offer'`, `ref_id=offer`) and decrements the cached balance atomically.
- Returns the **new `points_balance`** (integer).
- Raises: `'not authenticated'`, `'guest profile not found'`, `'offer not found'`, `'not authorised: offer belongs to another hotel'`, `'offer is not active'`, **`'insufficient points balance'`** (when balance < cost — surface this clearly to the user).
- Call: `supabase.rpc('redeem_loyalty_offer', { p_offer_id })`.

---

## 3. Check-in / check-out — `stays` additions (agent 04)

### New columns on `stays`
| column | type | null | default | notes |
|---|---|---|---|---|
| `checked_in_at` | timestamptz | **yes** | — | set when the guest checks in |
| `checked_out_at` | timestamptz | **yes** | — | set when the guest checks out |

### `stays.status` — widened allowed set
Allowed values: **`active` | `archived` | `reserved` | `checked_in` | `checked_out`** (default remains `'active'`).

**Backward-compatible mapping (no existing row is rewritten):**
- `active` — legacy "current in-house stay". **Still the operative LIVE status**: ordering RLS (`orders_insert`), `get_active_stay()`, and `get_hotel_stats()` all key off `status = 'active'`. Semantically equivalent to `checked_in`. Existing rows keep `active`.
- `archived` — legacy "past stay". Semantically equivalent to `checked_out`. Existing rows keep `archived`.
- `reserved` — new: stay created, guest not yet checked in.
- `checked_in` — new: guest has checked in (also set `checked_in_at`).
- `checked_out` — new: guest has checked out (also set `checked_out_at`).

**Important for agent-04:** the existing flows recognise **`active`** (not `checked_in`) as the live stay. To avoid breaking ordering/stats/active-stay lookup, when a guest checks in you may keep `status = 'active'` and just stamp `checked_in_at`, OR coordinate at Wave 2 if you want the live status renamed to `checked_in`. The payments client-insert policy accepts **both** `active` and `checked_in` as a live stay. Check-out should set `checked_out_at` and move the stay to `checked_out` (or legacy `archived`).

These columns/values **are typed** in `database.ts` (`stays` Row/Insert/Update).

---

## 4. Payments (agent 05)

### `payments` table
| column | type | null | default | notes |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |
| `hotel_id` | uuid | no | — | FK `hotels(id)` CASCADE |
| `guest_id` | uuid | no | — | FK `profiles(id)` CASCADE |
| `stay_id` | uuid | no | — | FK `stays(id)` CASCADE |
| `order_id` | uuid | **yes** | — | FK `orders(id)` ON DELETE SET NULL. NULL = not tied to a single order (e.g. a stay/global settlement). |
| `amount` | numeric(10,2) | no | — | |
| `currency` | text | no | `'DZD'` | |
| `method` | text | no | — | **CHECK in (`app_card`, `reception`)** |
| `provider` | text | no | `'chargily'` | **CHECK in (`chargily`)** |
| `provider_ref` | text | yes | — | Chargily checkout/transaction id (used by webhook to match) |
| `status` | text | no | `'pending'` | **CHECK in (`pending`, `paid`, `failed`, `refunded`)** |
| `checkout_url` | text | yes | — | Chargily hosted-checkout URL |
| `created_at` | timestamptz | no | `now()` | |
| `updated_at` | timestamptz | no | `now()` | auto-updated by trigger |

### `orders` — new payment columns (typed in `database.ts`)
| column | type | null | default | allowed |
|---|---|---|---|---|
| `payment_status` | text | no | `'unpaid'` | `unpaid` \| `pending` \| `paid` |
| `payment_method` | text | **yes** | — (NULL) | `app_card` \| `reception` \| NULL (NULL = not chosen yet) |

Existing order rows backfill to `payment_status = 'unpaid'`, `payment_method = NULL`.

### `expenses` view — re-created
Now selects: `id, hotel_id, stay_id, guest_id, amount, status, created_at, payment_status, payment_method`. Existing columns keep the same names/positions; the two payment columns are **appended**, so existing consumers are unaffected. (`amount` is `orders.total_amount`; view excludes `status = 'cancelled'`.) Typed in `database.ts`.

### RLS — payments
- **SELECT:** client → own payments (`guest_id = auth.uid()`); staff/admin → all payments in their hotel.
- **INSERT (client):** `get_my_role() = 'client' AND guest_id = auth.uid()` and an existing stay of theirs in their hotel with `status IN ('active','checked_in')`. Use this for guest-initiated `app_card` payments.
- **INSERT (staff/admin):** any payment in their hotel (e.g. recording a `reception` payment).
- **UPDATE:** staff/admin in their hotel (e.g. mark a reception payment `paid`).
- **Webhook / provider callbacks** that update `payments.status` and `orders.payment_status` run server-side via the **service-role admin client** (`src/lib/supabase/admin.ts`), which bypasses RLS — use it in the Chargily webhook route (there is no anon write policy on payments).

---

## 5. What is typed vs. untyped in `database.ts`

**Typed (do not re-edit — agent-00 owns this file):**
- `stays`: + `status` widened union, + `checked_in_at`, + `checked_out_at`.
- `orders`: + `payment_status`, + `payment_method`.
- `expenses` view Row: + `payment_status`, + `payment_method`.

**Untyped (use `const db = supabase as any`):** `ad_banners`, `flash_sales`, `showcase_hotels`, `loyalty_accounts`, `loyalty_transactions`, `loyalty_offers`, `payments`.

---

## 6. Anon-read surface (security summary)
The **only** rows the anon role can read are `ad_banners`, `flash_sales`, `showcase_hotels` where `is_active = true`, SELECT-only. Anon has **no** write access anywhere and **no** read access to any tenant data. Everything else requires `authenticated` and is hotel-scoped via `get_my_hotel_id()` / role-gated via `get_my_role()`. Cross-tenant isolation holds for every new table.
