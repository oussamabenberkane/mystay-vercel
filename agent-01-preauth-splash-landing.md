# Agent 01 — Pre-auth experience: Splash + Landing (PRIMARY UI/DESIGN AGENT)

**Role:** Build the brand-new public, pre-login experience: a splash screen and a marketing landing page. This is the most design-sensitive surface in the project — **use the `frontend-design` skill** and set the visual bar.

## Context (locked decisions)
- **Showcase only.** Partner-hotel cards are marketing content (`showcase_hotels` table). Clicking a card or a login/signup icon leads to the **existing** `(auth)` login / signup-with-hotel-code flow. **Do not** change tenancy or build hotel-specific booking.

## Responsibilities
1. **Splash screen (A1):** first screen on app launch — centered "My Stay" logo only, displayed for a **configurable delay (default 2–3s)** via an env/config constant, then **auto-redirect** to the landing page (no user action). Respect locale prefix (`localePrefix: 'always'`).
2. **Landing page (A2):** public page containing —
   - **Ad-banner carousel** — auto-advance **and** manual controls; reads active `ad_banners`.
   - **"Ventes Flash" (flash sales)** section — limited-time offers from `flash_sales`, each with a live **countdown timer** to `ends_at`; hide/disable expired ones.
   - **Partner-hotel cards** — image, name (e.g. "Helios Hôtel"), location, indicative price, rating, from `showcase_hotels`.
   - **Login / signup navigation** — clear clickable entry points into the existing `(auth)` routes.
3. **Routing/middleware:** make splash + landing reachable while **unauthenticated**. Decide the entry route (today `/[locale]` redirects to `/login`); reroute so a fresh visitor sees splash → landing, while already-authenticated users still go to their role home. You are the **only** agent allowed to edit `src/middleware.ts` — keep the `next-action` server-action bypass intact and the "null role → let through" backstop.

## Inputs
- `SCHEMA-CONTRACT.md` from agent-00 (table/column names, public-read RLS).
- `src/middleware.ts`, `src/app/page.tsx`, `src/app/[locale]/page.tsx`, `src/app/[locale]/(auth)/` — current entry/redirect logic.
- Brand tokens in use across the app: navy `#1B2D5B`, gold `#C9A84C`, cream `#F8F0E8`, muted `#7A8BA8`; fonts via `font-heading`. Reuse the existing "My Stay" logo asset (per memory, app brand is always "My Stay", never a tenant name).
- shadcn/ui + Tailwind v4 + next-intl conventions.

## Deliverables
- Splash route/component with configurable delay + auto-redirect.
- Landing `page.tsx` (server) + `_components/*-client.tsx` (carousel, flash-sales timer, hotel cards) following the repo's server/client split.
- Public Supabase reads via the anon/server client (RLS public-read content only).
- `messages/{en,fr,ar}.json` additions under the **`landing.*`** namespace only (full en/fr/ar parity; `ar` RTL-correct).
- Minimal, clean middleware change enabling the public flow.

## Success criteria
- Cold launch: splash shows the logo, waits the configured delay, auto-advances to landing — no tap needed.
- Carousel auto-plays and responds to manual nav; flash-sale timers count down live and expire correctly; hotel cards render real `showcase_hotels` rows; login/signup buttons reach the existing auth pages.
- Unauthenticated users can view splash/landing; authenticated users are still redirected to their role home; server actions still work (bypass intact).
- Fully responsive (mobile-first PWA), all three locales correct including RTL, polished and on-brand (not generic).
- `npm run build` and `npm run lint` pass.

## Boundaries
- Do not change tenancy, signup logic, or build booking/availability.
- Do not edit `database.ts` (use `const db = supabase as any` for `showcase_hotels`/`ad_banners`/`flash_sales`).
- Admin management of this content belongs to **agent-02** — you only render. Coordinate the QR target URL with **agent-06** at integration.
