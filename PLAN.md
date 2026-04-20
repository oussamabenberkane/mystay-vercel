# My Stay — MVP Architecture Plan

## MVP Scope (Final Decisions)

### Included
- Auth: signup / login / password reset (Supabase Auth)
- Roles: `client`, `staff`, `admin`
- Multi-tenancy: `hotel_id` on all tables, enforced via RLS
- Profile: full_name, phone, language preference
- Stay management: admin creates stays, guest views their active stay
- Room service: menu (categories + items) → cart → orders → status tracking
- Service requests: cleaning / maintenance / other, with priority (normal/urgent)
- Real-time chat: broadcast per hotel (guest → any available staff)
- Expenses: Postgres VIEW derived from orders (no separate table)
- In-app notifications via Supabase Realtime
- Push notifications: Web Push API (service worker + VAPID + Edge Function)
- Admin dashboard: users, stays, menu CRUD, orders overview, requests overview, basic stats
- i18n: English, French, Arabic (next-intl)
- PWA (next-pwa)

### Excluded from MVP
- Payment integration
- PDF bill generation
- Feedback system
- PMS integration
- Loyalty program
- Advanced analytics

---

## Database Schema Summary

### Tables
- `hotels` — id, name, slug, logo_url, created_at
- `profiles` — id (= auth.uid), hotel_id, role, full_name, phone, language, created_at
- `rooms` — id, hotel_id, number, type, floor, created_at
- `stays` — id, hotel_id, guest_id, room_id, check_in, check_out, status [active|archived], created_at
- `menu_categories` — id, hotel_id, name, sort_order
- `menu_items` — id, hotel_id, category_id, name, description, price, image_url, is_available, sort_order
- `orders` — id, hotel_id, stay_id, guest_id, status [pending|confirmed|preparing|delivering|delivered|cancelled], total_amount, notes, created_at, updated_at
- `order_items` — id, order_id, menu_item_id, quantity, unit_price
- `service_requests` — id, hotel_id, stay_id, guest_id, type [cleaning|towels|maintenance|other], description, priority [normal|urgent], status [pending|in_progress|completed|cancelled], created_at, updated_at
- `messages` — id, hotel_id, stay_id, sender_id, content, created_at
- `push_subscriptions` — id, user_id, subscription (jsonb), created_at

### Views
- `expenses` — derived from orders (stay_id, total_amount, created_at, status)

---

## Project Structure

```
my-stay/                          ← project root (Next.js app lives here)
├── src/
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   └── signup/
│   │   │   ├── (guest)/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── menu/
│   │   │   │   ├── orders/
│   │   │   │   ├── requests/
│   │   │   │   ├── chat/
│   │   │   │   └── expenses/
│   │   │   ├── (staff)/
│   │   │   │   ├── orders/
│   │   │   │   ├── requests/
│   │   │   │   └── chat/
│   │   │   └── (admin)/
│   │   │       ├── users/
│   │   │       ├── stays/
│   │   │       ├── menu/
│   │   │       └── operations/
│   │   └── api/
│   │       └── push/
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts       ← browser client
│   │   │   ├── server.ts       ← server client (cookies)
│   │   │   └── middleware.ts   ← middleware client
│   │   ├── types/
│   │   │   └── database.ts     ← generated Supabase types
│   │   └── utils/
│   ├── components/
│   │   ├── ui/                 ← shadcn/ui primitives
│   │   ├── guest/
│   │   ├── staff/
│   │   └── admin/
│   ├── hooks/
│   └── middleware.ts
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── seed.sql
├── messages/                   ← i18n translation files
│   ├── en.json
│   ├── fr.json
│   └── ar.json
└── public/
    └── sw.js                   ← service worker for push notifications
```

---

## Agent Map & Dependencies

```
WAVE 1 (parallel — start immediately):
  Agent 01 — DB Schema, Migrations, RLS, Seed
  Agent 02 — Next.js Setup, Dependencies, Project Structure, i18n, PWA

WAVE 2 (after both Wave 1 agents complete):
  Agent 03 — Auth Flows + Middleware + Role-based Routing

WAVE 3 (parallel — after Agent 03 completes):
  Agent 04 — Room Service (menu, cart, orders, real-time)
  Agent 05 — Service Requests (guest + staff, real-time)
  Agent 06 — Chat (broadcast, real-time, push notifications)
  Agent 07 — Admin Dashboard (users, stays, menu CRUD, operations, stats)
```

---

## Key Architectural Decisions

1. **Expenses as VIEW**: No separate expenses table. A Postgres view aggregates from `orders` to avoid sync bugs.
2. **Chat is broadcast per hotel**: Messages table scoped by `hotel_id`. Staff subscribes to hotel channel, guests subscribe via their `stay_id`.
3. **Push via Web Push + Edge Function**: VAPID-based Web Push. Subscriptions stored in `push_subscriptions`. A Supabase Edge Function sends pushes on order/request status change via DB trigger.
4. **Role resolution**: `profiles` table queried after login. Role stored in React context / Zustand. Middleware reads from Supabase session + profiles on every protected route.
5. **No JWT custom claims for MVP**: Profile lookup on auth instead. Simpler to implement, acceptable performance for MVP scale.
6. **i18n via next-intl**: Locale in URL path `[locale]`. RTL support for Arabic.
7. **Shadcn/ui + Tailwind**: UI component library for speed and consistency.
