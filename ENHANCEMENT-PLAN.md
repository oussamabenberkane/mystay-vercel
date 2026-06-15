# My Stay — Enhancement Plan (from "REMARQUS MY STAY.pdf")

Derived from the French spec. Two parts: (A) a new pre-auth screen flow (splash + landing), and (B) five gaps found while reviewing the app. Locked decisions from the product owner:

- **Hotel model:** *Marketing showcase only.* The landing page shows partner-hotel cards as CMS content. The flow still ends at the existing login / signup-with-hotel-code. **Tenancy is unchanged** — a guest is still bound to one hotel at signup.
- **Payments:** *Chargily* (Algeria — CIB / Edahabia via SATIM). Hosted checkout + webhook.
- **Check-in / check-out:** *App-level status + timestamps* on the `stays` row. No PMS, no settlement coupling.

## Scope → enhancements

| # | Item (PDF) | Type | Owner agent |
|---|------------|------|-------------|
| A1 | Splash screen (configurable delay, auto-redirect) | New, UI | 01 |
| A2 | Landing page: ad carousel, flash-sales w/ timer, partner-hotel cards, login/signup nav | New, UI | 01 (render) + 02 (admin CMS) |
| B1 | Loyalty program (points + special offers) | New | 03 |
| B2 | In-app check-in / check-out | New | 04 |
| B3 | Card payment via app vs at reception (Chargily) | New | 05 |
| B4 | QR code link broken | Bug fix | 06 |
| B5 | Chat does not display completely | Bug fix | 06 |

## Agents

- **agent-00-foundation-schema** — DB migrations, RLS, RPCs, schema contract for everything below. **Blocking root.**
- **agent-01-preauth-splash-landing** — splash + public landing page UI + public routing/middleware. **Primary UI/design agent.**
- **agent-02-admin-promo-cms** — admin pages + actions to manage banners, flash sales, showcase hotels (content agent-01 renders).
- **agent-03-loyalty-program** — points ledger, earning hooks, guest loyalty page, admin offers.
- **agent-04-checkin-checkout** — guest check-in/out actions + buttons, staff/admin live status.
- **agent-05-payments-chargily** — Chargily integration, pay-via-app-vs-reception choice, webhook, payment records.
- **agent-06-bugfixes-qr-chat** — fix QR destination + chat layout/overflow. Independent of schema.

## Ordered execution plan

```
Wave 0 (blocking)      ┌─ agent-00-foundation-schema ─┐   (and agent-06 may start now, in parallel)
                       │                              │
Wave 1 (parallel) ─────┴─ 01 · 02 · 03 · 04 · 05 ─────┘   all consume the schema contract
                          (agent-06 continues here if not already done)

Wave 2 (integration)   merge worktrees; resolve the shared-file touchpoints below; smoke test
```

### Which agent runs first
**agent-00-foundation-schema.** Every new-feature agent (01–05) depends on its schema contract. Start it alone.

### What runs in parallel
- **agent-06** is independent of the schema and can run *immediately*, concurrently with agent-00.
- After agent-00 publishes the schema contract, **agents 01, 02, 03, 04, 05 run fully in parallel.** Decoupled by the contract; agent-01 reads what agent-02 writes only at runtime (seed/CMS data), not at build time.

### Which agents do UI work
All except 00 touch UI. Breakdown:
- **agent-01 is the primary UI/design agent** — net-new public marketing surface (splash + landing). It should use the `frontend-design` skill and own the design language for these pages.
- **agent-02** — admin CMS UI (existing shadcn/admin patterns).
- **agent-03** — guest loyalty page + admin offers UI.
- **agent-04** — guest check-in/out buttons + staff/admin status UI.
- **agent-05** — payment-choice + checkout UI inside orders/expenses.
- **agent-06** — chat layout fix (UI) + QR component fix.

## Dependencies & boundaries (minimize overlap)

- **DB / migrations / `database.ts`:** owned **only** by agent-00. Feature agents follow the repo's `const db = supabase as any` pattern for new tables and **must not edit** `database.ts` — this removes the biggest conflict source.
- **`src/middleware.ts`:** edited **only** by agent-01 (new public routes: `/`, splash, landing must be reachable while unauthenticated). Other agents add no middleware logic.
- **`messages/{en,fr,ar}.json`:** shared. Each agent adds keys **only** under its own top-level namespace and never reorders existing keys, so merges stay trivial. Namespaces: `landing.*` (01), `adminPromos.*` (02), `loyalty.*` (03), `checkin.*` (04), `payment.*` (05), bug fixes reuse existing `guest.chat.*` (06). `ar` is RTL — keep parity across all three locales.
- **Guest navigation / dashboard cards:** agents 03 (loyalty) and 04 (check-in) each add an entry. Add as distinct lines; if both edit the same nav file, apply sequentially at merge. Flagged as a known touchpoint.
- **QR target URL (06 ↔ 01):** the QR should point to a real working public route. agent-06 defaults the destination to the app root/landing; if agent-01 finalizes a landing route, agent-06 uses it. Coordinate the final URL at Wave 2.
- **Check-out ↔ payments (04 ↔ 05):** intentionally decoupled. Per the locked scope, check-out only sets status/timestamps. agent-05 owns *all* payment/settlement logic separately on orders/expenses. agent-04 must not add payment logic.

## Run isolation
Run the Wave 1 agents in separate git worktrees (`isolation: "worktree"`) so parallel file writes don't collide, then integrate at Wave 2. agent-00 runs on the base branch first and is merged before Wave 1 forks.
