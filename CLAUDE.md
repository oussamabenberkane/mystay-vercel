# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Start dev server (Next.js, Turbopack off)
npm run build            # Production build
npm run start            # Serve production build
npm run lint             # ESLint (eslint-config-next, flat config in eslint.config.mjs)
npm run generate-vapid   # Generate VAPID keypair for web-push, prints env vars to add
npx tsx scripts/seed-helios.ts   # Seed the "HELIOS Hotel" demo tenant (rooms, users, menu, stays)
```

There is **no test suite** (no test runner, no test files). Do not assume one exists.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Supabase (Auth + Postgres + RLS + Realtime) · next-intl (en/fr/ar) · Tailwind v4 · shadcn/ui + Radix · Zustand · PWA (next-pwa + web-push). Path alias `@/*` → `src/*`.

## Architecture

This is a **multi-tenant hotel guest-services PWA**. Every row is scoped by `hotel_id`; tenants never see each other's data. There are three roles — `client` (guest), `staff`, `admin` — and the entire app is partitioned by role.

### Routing & route groups
All pages live under [src/app/[locale]/](src/app/[locale]/) — the `[locale]` segment is **always present** (`localePrefix: 'always'`). Route groups map 1:1 to roles:
- `(auth)` — login/signup/password reset (public)
- `(guest)` — client-facing: dashboard, menu/cart, orders, requests, chat, expenses, events, info, feedback
- `(staff)` — staff order/request/chat queues
- `(admin)` — operations dashboard, menu/users/stays/announcements/settings management

Pages follow a `page.tsx` (server) + `_components/*-client.tsx` (client) split. Shared building blocks are in [src/components/](src/components/) (`guest/`, `staff/`, `admin/`, `shared/`, `ui/`).

### Auth, sessions, and role gating — [src/middleware.ts](src/middleware.ts)
The middleware is the central control point and runs on every non-asset request in this order:
1. **Server actions bypass everything** — a `POST` with a `next-action` header is passed straight to the intl middleware. Never add redirect logic that catches server-action POSTs (they post to the page path and a redirect would break them).
2. Refresh the Supabase session via `updateSession` ([src/lib/supabase/middleware.ts](src/lib/supabase/middleware.ts)).
3. Redirect unauthenticated users to `/{locale}/login`; redirect authenticated users away from auth pages to their role's home (`getRoleRedirect`).
4. Enforce role-based access (`getRequiredRole`) — wrong-role users are bounced to their own home.
5. Run next-intl and **propagate its locale headers onto the Supabase response** so `getRequestConfig` sees the right locale.

Note: if the `profiles` role lookup returns null (DB unavailable), the middleware **lets the request through** rather than redirecting — this deliberately avoids an infinite redirect loop; page-level guards are the backstop. When adding a new guest route, add its path prefix to `getRequiredRole`.

### Supabase clients — pick the right one
- [server.ts](src/lib/supabase/server.ts) — server components / actions, cookie-based, **anon key, RLS enforced**. Default choice.
- [client.ts](src/lib/supabase/client.ts) — browser (realtime subscriptions, client components).
- [middleware.ts](src/lib/supabase/middleware.ts) — session refresh only.
- [admin.ts](src/lib/supabase/admin.ts) — **service-role key, bypasses RLS**. Server-only, used for push fan-out. Never import into client code.

### Security model — RLS is primary
Row-Level Security is the real access boundary, defined in [supabase/migrations/002_rls_policies.sql](supabase/migrations/002_rls_policies.sql). Two `SECURITY DEFINER` helpers — `get_my_hotel_id()` and `get_my_role()` — drive every policy. Clients can only touch their own rows for their active stay; staff/admin are scoped to their hotel. Server actions *also* re-check `user` and `role` defensively, but never rely on app-level checks alone — the policies must hold.

### Server Actions — [src/lib/actions/](src/lib/actions/)
All mutations and most reads go through `'use server'` actions, one file per domain (room-service, chat, service-requests, admin-menu, admin-stays, admin-users, announcements, hotel-info, feedback, auth). Conventions used everywhere:
- Return a result object like `{ data, error }` (or `{ orderId, error }`) — **actions never throw**; they `try/catch` and return an `error` string.
- Re-fetch `auth.getUser()` and the caller's `profiles` row at the top, then gate on role.
- The Supabase client is cast `const db = supabase as any` because the generated [src/lib/types/database.ts](src/lib/types/database.ts) only covers core tables. Follow this existing pattern rather than fighting the types.

### Realtime + polling fallback
Chat ([guest/chat](src/app/[locale]/(guest)/chat/page.tsx), staff chat) and the events page use Supabase Realtime (`postgres_changes` on `messages`) **plus a ~2s `setInterval` polling fallback**, because WebSockets are blocked in some deployment/network environments. Both paths dedupe against a shared "seen IDs" ref, and sent messages use optimistic UI reconciled when the real row arrives. Keep both paths in sync when changing message flow.

### Push notifications
[src/lib/utils/push.ts](src/lib/utils/push.ts) (`sendPushToUser`, `sendPushToHotelStaff`) and the [/api/push](src/app/api/push/route.ts) route use web-push with the service-role DB client. They are **gated by `vapidConfigured`** (all VAPID env vars present and not placeholder), **never throw**, and auto-delete stale subscriptions on a 410/404. Subscriptions are managed client-side via [use-push-notifications.ts](src/hooks/use-push-notifications.ts) and the service worker [public/sw.js](public/sw.js).

### Client state — Zustand
[auth-store.ts](src/lib/store/auth-store.ts) holds the current `profile`, hydrated by [AuthProvider](src/components/providers/auth-provider.tsx) via `onAuthStateChange`. [cart-store.ts](src/lib/store/cart-store.ts) holds the room-service cart. Read `profile` from the store in client components rather than re-querying.

### i18n
Locales `en`/`fr`/`ar` in [src/lib/i18n/config.ts](src/lib/i18n/config.ts); translation catalogs in [messages/](messages/). `ar` requires RTL handling. User-facing strings go through `next-intl` (`useTranslations` client-side, `getTranslations` server-side) — don't hardcode copy.

## Environment variables

Not committed (`.env*` is gitignored, no `.env.example`). Required:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — client + server
- `SUPABASE_SERVICE_ROLE_KEY` — admin client / push (server-only, never expose)
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` — push (optional; absence disables push gracefully)

## Important gotchas

- **Migrations are incomplete.** [supabase/migrations/](supabase/migrations/) only defines the original core schema. The `announcements`, `feedback`, and `hotel_info` tables are referenced in code but have **no migration file** — they were applied directly in the Supabase dashboard. When you add schema, the live DB is the source of truth; consider backfilling a migration but don't assume the directory is complete.
- **Profiles are created by the app after signup**, not by a DB trigger (the `handle_new_user` trigger is an intentional no-op) — because `hotel_id` and `role` aren't known at auth time.
- **Don't break server actions in middleware** — see the `next-action` bypass above.

## Commit convention (strict — see [commit-convention.md](commit-convention.md))

Single line only: `<type>: <short imperative description>`. Types: `feat fix docs refactor test chore style perf`. Imperative mood ("Add", not "Added"). **Do NOT add `Co-Authored-By`, AI/bot attribution, sign-offs, trailers, or a body** unless the change genuinely requires explanatory context. This overrides any default attribution behavior.
