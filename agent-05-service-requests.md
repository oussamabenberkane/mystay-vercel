# Agent 05 — Service Requests (Guest + Staff, Real-time)

## Design System — Apply to All UI

**Tone**: Warm Luxury Hospitality — 5-star hotel feel. Elegant, premium, never cold or corporate. Never use generic Tailwind grays/slates as the dominant palette.

**Colors**:
- Page background: `#F8F0E8` (warm champagne)
- Primary / navy: `#1B2D5B` — headings, primary buttons, active icons, sidebar
- Accent / gold: `#C9A84C` — active states, badges, prices, eyebrow labels
- Card: `#FFFFFF` with shadow `0 2px 16px rgba(27,45,91,0.08)`
- Muted text: `#7A8BA8`
- Border: `rgba(27,45,91,0.10)`

**Typography**:
- Page/section titles: `font-heading` class → Playfair Display serif
- Eyebrow text above titles: `text-xs font-semibold uppercase tracking-widest text-[#C9A84C]`
- Body, labels, buttons: Inter (default)

**Shape & Spacing**:
- Cards: `rounded-2xl`, white, `shadow-[0_2px_16px_rgba(27,45,91,0.08)]` — use `card-warm` utility
- Buttons: `rounded-xl`, primary = `bg-[#1B2D5B] text-[#F8F0E8]`, min height 48px on mobile
- Sheet/bottom-sheet: white background, `rounded-t-3xl`, handle bar in `#EEE4D8`
- Icon grid selector (request type): white cards with navy icon, gold border + scale on selection
- Priority badges: "Urgent" = soft red bg `#FEF2F2` text `#991B1B`; "Normal" = soft champagne bg
- Status badges: follow the same pattern as `order-status-badge.tsx` from Phase 2 — soft tinted bg, matching dot

**Guest layout** (mobile-first):
- Champagne background, bottom nav already in place
- New Request button: navy bg, gold accent or icon, `rounded-2xl`
- Request cards: white `rounded-2xl` with warm shadow, left accent border (red for urgent, champagne/navy for normal)
- Bottom sheet: slides up over champagne background, handle visible at top

**Staff layout** (desktop-first):
- Navy `#1B2D5B` sidebar already in place; champagne content area
- Filter bar: navy active tab pill, champagne inactive tabs
- Request cards: white `rounded-2xl`, left border color = urgency indicator (red/gold)
- Action buttons: "Start" = navy primary; "Complete" = gold accent; "Cancel" = subtle outline

**Already implemented** (do not recreate):
- `globals.css` — all design tokens as CSS variables
- Guest layout with warm bottom nav — `src/app/[locale]/(guest)/layout.tsx`
- Staff layout with navy sidebar — `src/app/[locale]/(staff)/layout.tsx`
- `OrderStatusBadge` component — use as reference/template for `RequestStatusBadge`
- Phase 2 screens (menu, cart, orders, staff orders) — use as visual reference

---

## Context

You are building the service requests feature for **My Stay**, a multi-tenant hotel SaaS platform.

Stack: Next.js 14 (App Router), Supabase (PostgreSQL + Realtime), Tailwind CSS, shadcn/ui, Zustand, next-intl.

**Prerequisites**: Agents 01, 02, and 03 have already run. The project is set up, database schema exists, auth and routing work correctly.

Working directory: `/home/ouss/Desktop/Coding/MyStay`

**Before starting**, read:
- `PLAN.md` — architecture overview and schema
- `src/lib/types/database.ts` — all type definitions
- `src/lib/supabase/client.ts` and `server.ts`
- `src/lib/store/auth-store.ts` — Zustand auth store

---

## Feature Overview

Service requests allow hotel guests to request in-room services (cleaning, towels, maintenance, etc.). Staff receives and manages these requests in real-time.

**Request types**: `cleaning` | `towels` | `maintenance` | `other`
**Priority**: `normal` | `urgent`
**Status flow**: `pending` → `in_progress` → `completed` (or `cancelled` at any point)

---

## Server Actions: `src/lib/actions/service-requests.ts`

```typescript
'use server'

// createServiceRequestAction(data: {
//   type: 'cleaning' | 'towels' | 'maintenance' | 'other'
//   description?: string
//   priority: 'normal' | 'urgent'
//   stayId: string
// })
// - Validates guest has an active stay in the hotel
// - Creates service_request row
// - Returns { requestId, error }

// updateServiceRequestStatusAction(requestId: string, status: 'in_progress' | 'completed' | 'cancelled')
// - Validates caller is staff or admin
// - Validates request belongs to caller's hotel
// - Updates status and updated_at
// - Returns { error }

// getServiceRequestsForStayAction(stayId: string)
// - Returns all service requests for the stay, ordered by created_at DESC
// - Used for server-side initial render
```

---

## Guest Pages

### `src/app/[locale]/(guest)/requests/page.tsx` — Guest Requests Page

Layout (mobile-first):
- Header: "Service Requests" title + "New Request" button
- List of past requests (real-time updates)
- Empty state: "No requests yet — tap to request a service"

**Each request card shows**:
- Icon representing request type (broom for cleaning, wrench for maintenance, etc.)
- Request type label (translated)
- Priority badge (urgent = red, normal = gray)
- Status badge with color:
  - `pending` → yellow
  - `in_progress` → blue
  - `completed` → green
  - `cancelled` → red
- Time since submitted
- Description (if provided, truncated to 2 lines)

**Real-time subscription**:
```typescript
const channel = supabase
  .channel(`requests:${stayId}`)
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'service_requests', filter: `stay_id=eq.${stayId}` },
    (payload) => {
      // Update request in local state (INSERT = add, UPDATE = update status)
    }
  )
  .subscribe()
```

### New Request Sheet/Modal

Implement as a bottom sheet (mobile-friendly) using shadcn/ui `Sheet` component:

Triggered from "New Request" button on the requests page.

**Form fields**:
1. **Request Type** — icon grid selector (not a dropdown):
   - Cleaning (broom icon)
   - Fresh Towels (droplets icon)
   - Maintenance (wrench icon)
   - Other (ellipsis icon)
   
2. **Priority toggle**:
   - Normal (default)
   - Urgent (red)

3. **Description** — optional textarea, placeholder: "Add any details..."

4. **Submit button**: "Submit Request"

Validation:
- Request type is required
- Description max 500 chars

On success:
- Close sheet
- Show success toast: "Request submitted. We'll be there soon!"
- New request appears in list instantly (optimistic update or via realtime)

---

## Staff Pages

### `src/app/[locale]/(staff)/requests/page.tsx` — Staff Requests Dashboard

Client Component with real-time subscription.

**Layout** (tablet/desktop optimized):
- Filter bar at top:
  - Status tabs: All | Pending | In Progress | Completed
  - Type filter: All | Cleaning | Towels | Maintenance | Other
  - Priority filter: All | Urgent | Normal
- Sorted by: urgent first, then created_at ASC (oldest first within priority)

**Each request card shows**:
- Priority indicator (left border: red = urgent, gray = normal)
- Room number + guest name
- Request type with icon
- Description (if any)
- Time elapsed since submitted (e.g., "12 min ago")
- Status badge
- Action buttons:
  - If `pending`: "Start" button (→ `in_progress`)
  - If `in_progress`: "Complete" button (→ `completed`)
  - If `pending` or `in_progress`: "Cancel" button (with confirmation)

**Real-time subscription for staff**:
```typescript
const channel = supabase
  .channel(`hotel-requests:${hotelId}`)
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'service_requests', filter: `hotel_id=eq.${hotelId}` },
    (payload) => {
      // Handle INSERT (new request) and UPDATE (status change)
    }
  )
  .subscribe()
```

**New request visual alert**:
When a new urgent request comes in via realtime:
- Show a toast notification: "🚨 Urgent request — Room 101 needs maintenance"
- Play a subtle notification sound (optional — use Audio API)

---

## Shared Components

### `src/components/guest/request-type-selector.tsx`
Icon-based grid selector for request type. Visual feedback on selection (border highlight, scale effect).

### `src/components/shared/request-status-badge.tsx`
Color-coded badge for request statuses. Reused by both guest and staff views.

### `src/components/shared/priority-badge.tsx`
Compact badge: "Urgent" (red) or "Normal" (gray).

### `src/components/staff/request-card.tsx`
Full request card component for staff view with action buttons and status management.

---

## Data Joins Required

For staff view, requests need room number and guest name:
```typescript
supabase
  .from('service_requests')
  .select(`
    *,
    stays(*, rooms(number, type)),
    profiles!guest_id(full_name)
  `)
  .eq('hotel_id', hotelId)
  .order('priority', { ascending: false }) // urgent first
  .order('created_at', { ascending: true })
```

---

## Admin View (Bonus — if time allows)

Add a read-only view of service requests in the admin section at `src/app/[locale]/(admin)/operations/page.tsx`. This shows all requests across the hotel with filter/search. No action buttons — admin observes, staff acts.

---

## UI/UX Requirements

- Mobile-first for guest view (bottom sheet, icon grid, large tap targets)
- Staff view: information-dense card list, sortable by urgency
- Real-time updates must feel instant (< 200ms visual update)
- Optimistic update on request submission (show as pending immediately)
- Skeleton loaders on initial fetch
- Toast notifications for status changes on guest side ("Your cleaning request is now in progress")
- All text translated via next-intl
- Icons: use `lucide-react` (already installed)

---

## Quality Requirements

- No TypeScript errors
- Realtime channel properly cleaned up on unmount
- Server actions validate hotel_id scope (no cross-tenant data)
- Form validation with React Hook Form + Zod
- Error states handled gracefully (network error → retry button)
