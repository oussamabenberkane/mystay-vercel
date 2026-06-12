---
name: frontend-design
description: Create distinctive, production-grade UI for the My Stay hotel platform. Use this skill when building or restyling any screen, component, or flow across the guest PWA, staff console, or admin dashboard (pages under src/app/[locale]/, components under src/components/). Produces polished, on-brand code that executes the established "warm luxury" hotel aesthetic with precision — never generic shadcn-gray AI slop.
license: Adapted from Anthropic's frontend-design skill (anthropics/skills) for the My Stay codebase.
---

This skill guides creation of distinctive, production-grade frontend for **My Stay** — a multi-tenant hotel guest-services PWA. Unlike a one-off artifact, this is a real product with an **established brand**. Your job is not to invent a new aesthetic every time; it is to execute the existing **warm-luxury hotel** system with exceptional attention to detail, and to deepen it where a screen feels flat or default.

The user provides a UI requirement: a guest screen, a staff queue, an admin view, or a component to build or refine. Read [CLAUDE.md](CLAUDE.md) for architecture (roles, route groups, Supabase, i18n) before building.

## Design Thinking

Before coding, anchor on three things:

- **Which surface?** The app has three audiences, each with a distinct mood — match it:
  - **Guest `(guest)`** — warm, calm, hospitable. Champagne background (`#F8F0E8`), generous white `card-warm` panels, Playfair headings, gold ornament. Mobile-first PWA with a fixed bottom nav (reserve `64px` at the bottom). This is concierge luxury, not a SaaS form.
  - **Staff `(staff)`** — operational, fast, legible at a glance. Navy sidebar (`--sidebar: #1B2D5B`), denser layout, status-driven cards (orders/requests/chat queues). Calm authority, not flashy.
  - **Admin `(admin)`** — dashboard clarity. Stats cards, tables, editors. Information-dense but still on-brand (navy/gold/champagne), never raw bootstrap gray.
- **Tone**: The committed direction is **warm luxury / refined hospitality** — navy + gold + champagne, serif display type, soft shadows, spring motion. Stay inside it. Do not introduce a competing aesthetic (no neon, no purple gradients, no brutalism) unless the user explicitly asks to rebrand.
- **Differentiation**: What one detail makes this screen feel *designed for a luxury hotel* rather than generated? A gold hairline rule, an uppercase tracked eyebrow label, a staggered reveal on load, a textured background — pick at least one intentional touch per screen.

**CRITICAL**: Intentionality over intensity. Most screens here are refined-minimal, so elegance comes from precise spacing, type rhythm, and restraint — not from piling on effects.

## The Brand System (use these, don't reinvent)

All tokens live in [src/app/globals.css](src/app/globals.css) (`@theme` + `:root`). **Prefer Tailwind v4 token utilities and CSS variables over hardcoded hex.** When a one-off value is unavoidable, match the palette exactly.

**Palette**
- `--navy: #1B2D5B` — primary, text, staff sidebar, headings on light
- `--gold: #C9A84C` — accent only; sharp and sparing (rules, active states, icons, focus ring)
- `--gold-light: #E8D5A3`, `--champagne: #F8F0E8` — warm background field
- `--muted-foreground: #7A8BA8` — slate, for secondary copy
- `--destructive: #C0392B`; surfaces are `--card: #FFFFFF` on champagne
- Use semantic tokens (`bg-background`, `text-foreground`, `bg-card`, `text-primary`, `border-border`, `bg-accent`) so dark-mode and theming hold.

**Typography**
- Headings → **Playfair Display** via `.font-heading` or `<h1>`–`<h4>` (already wired in `globals.css`). Serif, characterful — this is the brand's voice.
- Body → **Inter** (`--font-sans`). Inter is acceptable *here* because it's the committed body face paired against a distinctive display serif — the pairing is the design. Don't swap fonts per screen.
- Signature detail seen across the app: tiny **uppercase eyebrow labels** — `text-[9px]/[11px] font-semibold uppercase tracking-[0.15em]` in gold or slate above a Playfair title. Reuse this pattern for section headers.

**Surfaces & depth**
- `.card-warm` / `.card-warm-sm` utilities: white panel, soft navy-tinted shadow (`0 2px 16px rgba(27,45,91,0.08)`), rounded. Prefer these over ad-hoc `shadow-md`.
- Radius scale is generous (`--radius: 0.75rem` up through `--radius-4xl`). Lean rounded, not sharp.

## Frontend Aesthetics Guidelines

- **Typography**: Pair Playfair display headings with Inter body. Establish clear hierarchy with size + weight + the uppercase-tracked eyebrow pattern. Tighten heading `leading`, give body comfortable line-height. Never set a Playfair body paragraph.
- **Color & Theme**: Dominant **navy/champagne** field with **gold as a sharp, rare accent** — a gold rule or active state reads as luxury; gold everywhere reads as cheap. Keep the warm, low-contrast calm; avoid pure-black text (use navy) and pure-white pages (use champagne).
- **Motion**: CSS-first — there is **no Motion/Framer library installed**. Use `tw-animate-css`, the existing keyframes in `globals.css` (`msg-rise`, `text-reveal`, `status-flash`, `typing-dot`), and the house spring easing `cubic-bezier(0.34, 1.56, 0.64, 1)`. Favor **one orchestrated load** with staggered reveals via `animation-delay` over scattered micro-interactions. Add new `@keyframes` to `globals.css`; don't reach for a runtime animation lib.
- **Spatial Composition**: Mobile-first (the guest PWA is the primary surface). Compose with `card-warm` panels, generous negative space on guest screens, controlled density on staff/admin. Use the gold hairline rule (`linear-gradient(to right, transparent, rgba(201,168,76,0.4), transparent)`) as a divider/ornament. Respect the `64px` bottom-nav safe area on guest pages and the fixed navy sidebar on staff.
- **Backgrounds & Visual Details**: Avoid flat solid fills — add quiet atmosphere. The chat surface already layers a faint 45° `repeating-linear-gradient` texture over champagne; reuse subtle textures, layered transparencies (`rgba(201,168,76,0.15)` gold washes with a `1px` gold border), and the soft navy shadow for depth. Decorative gold borders and grain-free, low-opacity patterns fit the brand.

## Stack & Codebase Constraints (non-negotiable)

- **Tailwind v4 + shadcn (`base-nova`, lucide icons)** — extend via `@theme` tokens in `globals.css`; reuse `src/components/ui/*` primitives instead of hand-rolling buttons/dialogs/inputs.
- **RTL-safe** — Arabic (`ar`) renders `dir="rtl"` ([src/app/[locale]/layout.tsx](src/app/[locale]/layout.tsx)). Use logical properties (`ms-`/`me-`, `ps-`/`pe-`, `start`/`end`, `text-start`) — **never** hardcode `left`/`right`/`ml-`/`pl-` for directional layout. Test mentally in both directions.
- **i18n copy** — all user-facing text goes through `next-intl` (`useTranslations` in client, `getTranslations` in server components) with keys in [messages/](messages/) (`en`/`fr`/`ar`). Never hardcode display strings; design for variable text length (French/Arabic run longer).
- **RSC boundaries** — `page.tsx` is a server component; interactivity/animation lives in `'use client'` components (the `_components/*-client.tsx` split). Keep animation and state on the client side.
- **PWA & mobile** — installable, fixed bottom nav, touch targets ≥ 44px, respect safe areas. Theme color is navy (`#1B2D5B`).
- **Accessibility** — sufficient contrast (gold-on-white text fails — use gold for accents/borders, navy for text), focus-visible rings (the ring token is gold), semantic headings, labeled controls.

## Never do this

- Don't ship default **shadcn-gray / system-font** screens — that's the "AI slop" this brand exists to avoid. If it looks like an untouched starter, it's wrong.
- No **purple gradients on white**, neon, or generic SaaS hero clichés.
- Don't introduce **new random fonts or color themes** per screen — consistency *is* the design here (the opposite of one-off artifact work). Deepen the system; don't fork it.
- Don't add hardcoded hex when a token exists, or hardcoded `left`/`right` when a logical property exists.

**IMPORTANT**: Match implementation effort to the surface. A guest screen earns careful spacing, a Playfair headline, a gold ornament, and a staggered load. A staff queue earns legibility and fast status cues. Both must feel unmistakably *My Stay* — warm, navy-and-gold, hospitable. Execute the established vision fully and with precision; that restraint is the craft.
