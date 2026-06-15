# Agent 02 — Admin CMS: banners, flash sales, showcase hotels

**Role:** Give admins a way to manage the content that agent-01's landing page renders. Pure admin tooling on top of the new CMS tables.

## Responsibilities
Build admin management (list / create / edit / toggle-active / delete / reorder) for:
1. **Ad banners** (`ad_banners`) — image, title, link URL, sort order, active.
2. **Flash sales** (`flash_sales`) — title, description, image, discount label, `starts_at`/`ends_at`, sort order, active.
3. **Showcase hotels** (`showcase_hotels`) — name, image, location, indicative price, rating, sort order, active.

Follow the existing announcements admin as the template — it is the closest analog and already does CRUD + active toggle well.

## Inputs
- `SCHEMA-CONTRACT.md` from agent-00.
- `src/app/[locale]/(admin)/admin/announcements/page.tsx` and `src/lib/actions/announcements.ts` — copy these patterns (server page + `'use server'` actions returning `{ data, error }`, never throwing, re-checking `auth.getUser()` + admin role).
- Existing admin shell/nav and shadcn form components.
- Image handling: match however announcements/menu images are handled today (URL field or existing upload path) — do not invent a new upload pipeline unless the repo already has one.

## Deliverables
- Admin pages under `src/app/[locale]/(admin)/admin/` for banners, flash sales, and showcase hotels (one section each; a single "Marketing"/"Promotions" area is fine).
- `src/lib/actions/admin-promos.ts` (`'use server'`) with CRUD + toggle actions for the three tables, scoped/guarded to admin, using `const db = supabase as any`.
- Admin nav entry/entries to reach the new section(s).
- `messages/{en,fr,ar}.json` additions under the **`adminPromos.*`** namespace only (en/fr/ar parity, RTL-safe).

## Success criteria
- An admin can create/edit/activate/deactivate/delete/reorder all three content types, and the changes appear on agent-01's landing page.
- Flash-sale `starts_at`/`ends_at` are settable and validated (end after start).
- Actions never throw; they return `{ data, error }` and enforce admin role + hotel scoping per RLS.
- `npm run build` and `npm run lint` pass.

## Boundaries
- Do not edit `database.ts`, `src/middleware.ts`, or the public landing components (agent-01 owns rendering).
- Do not touch loyalty/payment/check-in surfaces.
- Keep all new translation keys under `adminPromos.*`; do not reorder existing keys.
