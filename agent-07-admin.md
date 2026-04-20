# Agent 07 — Admin Dashboard (Users, Stays, Menu CRUD, Operations, Stats)

## Design System — Apply to All UI

**Tone**: Warm Luxury Hospitality — even the admin dashboard should feel refined, not like a generic SaaS admin panel. Think boutique hotel management software, not spreadsheet software. Warm champagne, deep navy, gold accents throughout.

**Colors**:
- Page/content background: `#F8F0E8` (warm champagne)
- Sidebar: `#1B2D5B` (deep navy) — already built, do not recreate
- Primary / buttons: `#1B2D5B` navy
- Accent: `#C9A84C` (warm gold) — active sidebar items, stat highlights, eyebrow text
- Card: `#FFFFFF` with shadow `0 2px 16px rgba(27,45,91,0.08)`
- Muted text: `#7A8BA8`
- Border: `rgba(27,45,91,0.10)`
- Danger / destructive: `#C0392B` (soft, not harsh red)

**Typography**:
- Page titles, card titles, stat values: `font-heading` → Playfair Display serif
- Eyebrow / section labels: `text-xs font-semibold uppercase tracking-widest text-[#C9A84C]`
- Table headers, labels, body, buttons: Inter (default)
- Stat values (big numbers on stat cards): Playfair Display, large, navy

**Stats Cards**:
- White `rounded-2xl` card with warm shadow (`card-warm` utility)
- Icon in a soft `rounded-xl` bg (champagne or navy-5% tint)
- Stat value in Playfair Display, large, navy
- Label in Inter, muted `#7A8BA8`, small uppercase
- Warning variant: gold `#C9A84C` accent; Danger variant: soft red border

**Tables**:
- White `rounded-2xl` card container with warm shadow
- Table headers: `text-xs font-semibold uppercase tracking-wider text-[#7A8BA8]` on champagne/white bg
- Row hover: very subtle champagne tint `rgba(248,240,232,0.6)`
- Row borders: `rgba(27,45,91,0.05)` — barely visible
- Action buttons in rows: small navy ghost buttons or icon buttons

**Dialogs / Modals**:
- White `rounded-3xl` card with generous padding `p-6`
- Warm shadow, NOT a default dark overlay + sharp corners
- Title in Playfair Display, navy
- Destructive confirm dialog: red-tinted "Confirm" button, muted cancel

**Forms (in dialogs)**:
- Input labels: `text-xs font-semibold uppercase tracking-wider text-[#7A8BA8]`
- Inputs: `rounded-xl border-[rgba(27,45,91,0.12)] bg-white focus:ring-[#C9A84C]`
- Submit button: full-width or right-aligned, navy bg

**Guest Dashboard** (bonus section at end of this agent):
- Follow the exact same warm champagne + navy + gold treatment
- Welcome card: prominent Playfair Display heading, room/date info
- Quick action grid: white `rounded-2xl` cards with navy icons, gold hover border
- Recent orders: same card style as guest orders page from Phase 2

**Admin sidebar** (already partially built):
- The `(staff)/layout.tsx` has a navy sidebar — **reuse the same pattern** for admin layout
- Admin sidebar items: Operations, Users, Stays, Menu (+ Rooms if implemented)
- Hotel name displayed in Playfair Display in the sidebar header

**Already implemented** (do not recreate):
- `globals.css` — all design tokens as CSS variables
- Staff layout with navy sidebar at `src/app/[locale]/(staff)/layout.tsx` — replicate this exact sidebar pattern for admin
- Phase 2 screens (menu, cart, orders, staff orders) — use as visual reference
- `OrderStatusBadge` — use as reference for any status badges

---

## Context

You are building the admin dashboard for **My Stay**, a multi-tenant hotel SaaS platform.

Stack: Next.js 14 (App Router), Supabase, Tailwind CSS, shadcn/ui, Zustand, next-intl.

**Prerequisites**: Agents 01, 02, and 03 have already run. The project is set up, database schema exists, auth and routing work correctly.

Working directory: `/home/ouss/Desktop/Coding/MyStay`

**Before starting**, read:
- `PLAN.md` — architecture overview and schema
- `src/lib/types/database.ts` — type definitions
- `src/lib/supabase/client.ts` and `server.ts`
- `src/lib/store/auth-store.ts`

The admin user is scoped to their hotel via `profiles.hotel_id`. They can only manage data within their hotel.

---

## Admin Layout

### `src/app/[locale]/(admin)/layout.tsx`

Desktop sidebar layout — **replicate the exact visual treatment from `src/app/[locale]/(staff)/layout.tsx` and `(staff)/_components/sidebar-nav.tsx`**, which already implements the navy sidebar correctly. Create an equivalent for admin:
- Left sidebar: `bg-[#1B2D5B]` (navy), fixed 256px wide
- Top of sidebar: gold `#C9A84C` "MS" monogram in a gold `rounded-xl` square + "My Stay" in gold tracking-widest uppercase + hotel name below in muted champagne/50
- Navigation links (active = gold bg + navy text pill; inactive = champagne/75 text + hover bg):
  - Operations — icon: LayoutDashboard
  - Users — icon: Users
  - Stays — icon: CalendarDays
  - Menu — icon: UtensilsCrossed
- Bottom: admin name + logout button in muted champagne text
- Main content area (`flex-1`, champagne `#F8F0E8` bg)
- Mobile: sidebar collapses — use Sheet component with same navy styling as a drawer

---

## Page 1: Operations Overview

### `src/app/[locale]/(admin)/operations/page.tsx`

Server Component — fetches stats and live data.

**Top stats cards** (4 cards in a row):
Call `get_hotel_stats(hotel_id)` RPC function:
- Active Stays (number)
- Orders Today (number)
- Pending Orders (number, with red badge if > 0)
- Pending Requests (number, with red badge if > 0)
- Revenue Today (currency formatted)

**Two columns below stats**:

Left column — Recent Orders (last 10):
```typescript
supabase.from('orders')
  .select('*, stays(*, rooms(number)), profiles!guest_id(full_name)')
  .eq('hotel_id', hotelId)
  .order('created_at', { ascending: false })
  .limit(10)
```
Each row: room number, guest name, status badge, amount, time ago.

Right column — Recent Service Requests (last 10):
```typescript
supabase.from('service_requests')
  .select('*, stays(*, rooms(number)), profiles!guest_id(full_name)')
  .eq('hotel_id', hotelId)
  .order('created_at', { ascending: false })
  .limit(10)
```
Each row: room, type, priority badge, status badge, time ago.

Add a "Refresh" button (since this is server-rendered, not real-time).

---

## Page 2: User Management

### `src/app/[locale]/(admin)/users/page.tsx`

**List all profiles for the hotel**:
```typescript
supabase.from('profiles')
  .select('*')
  .eq('hotel_id', hotelId)
  .order('created_at', { ascending: false })
```

**Table layout** (desktop) / **Card list** (mobile):
Columns: Name, Email (from auth — see note below), Role badge, Phone, Language, Created, Actions

**Note on email**: `auth.users` is not accessible via RLS. For MVP, store email in `profiles` table. 

**Add email column to profiles table**: The migration (Agent 01) should include this, but if not, add a migration `003_add_email_to_profiles.sql`:
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;
```
And update the signup flow (Agent 03) to store email in profiles at creation.

**Filters**:
- Search by name
- Filter by role (All / Client / Staff / Admin)

**Actions per user**:
- Change role (client ↔ staff ↔ admin) — via dropdown
- View stays (for clients)
- Delete user (with confirmation) — this deletes the profile; auth user deletion requires service role

### Create Staff/Admin Dialog

Button: "Add User" → opens dialog:
- Full name, email, password, role (staff/admin), phone, language
- Uses **service role** (never expose to client!) via a server action
- Server action uses `supabase.auth.admin.createUser()` with service role client
- Creates auth user + profile in one action

### Server Actions: `src/lib/actions/admin-users.ts`

```typescript
'use server'

// createUserAction(data: { email, password, fullName, phone, language, role, hotelId })
// - Uses service role Supabase client
// - Creates auth user via supabase.auth.admin.createUser
// - Creates profile row
// - Returns { userId, error }

// updateUserRoleAction(profileId: string, role: 'client' | 'staff' | 'admin')
// - Validates caller is admin of same hotel
// - Updates profiles.role
// - Returns { error }

// deleteUserAction(profileId: string)
// - Validates caller is admin of same hotel
// - Deletes profile (cascades to auth via FK if configured)
// - For auth user deletion: call supabase.auth.admin.deleteUser
// - Returns { error }
```

**Service role client** (for admin actions only):
### `src/lib/supabase/admin.ts`
```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
```
**This client is ONLY used in server actions, never in client components.**

---

## Page 3: Stay Management

### `src/app/[locale]/(admin)/stays/page.tsx`

**List all stays for the hotel**:
```typescript
supabase.from('stays')
  .select('*, rooms(*), profiles!guest_id(full_name, email)')
  .eq('hotel_id', hotelId)
  .order('created_at', { ascending: false })
```

**Table**:
Columns: Guest name, Room number + type, Check-in, Check-out, Status badge (Active/Archived), Actions

**Filters**:
- Status: All / Active / Archived
- Search by guest name or room number

**Actions**:
- Archive stay (change status to 'archived') — with confirmation
- View stay details (expand row or navigate to detail page)

### Create Stay Dialog

Button: "New Stay" → dialog:
1. Select guest (dropdown of hotel clients)
2. Select room (dropdown of rooms — show availability)
3. Check-in date picker
4. Check-out date picker
5. Submit

**Room availability check**: A room should only have one active stay. Add validation in the server action.

### Server Actions: `src/lib/actions/admin-stays.ts`

```typescript
'use server'

// createStayAction(data: { guestId, roomId, checkIn, checkOut })
// - Validates room is not already occupied (no active stay for that room)
// - Creates stay row
// - Returns { stayId, error }

// archiveStayAction(stayId: string)
// - Validates caller is admin of the hotel
// - Sets stays.status = 'archived'
// - Returns { error }
```

---

## Page 4: Menu Management

### `src/app/[locale]/(admin)/menu/page.tsx`

**Layout**:
- Left: Category list (sortable by drag-and-drop — optional for MVP, use sort_order buttons instead)
- Right: Items within selected category

### Category Management

**Category list**:
- Each category: name, item count, sort order, Edit button, Delete button
- "Add Category" button at top → inline form or dialog

**CRUD operations**:
```typescript
// createCategoryAction(name: string, hotelId: string)
// updateCategoryAction(id: string, name: string, sortOrder: number)
// deleteCategoryAction(id: string)  — only if no items in category
```

### Item Management

**Item list** (within selected category):
- Grid or table view
- Each item: image thumbnail, name, price, availability toggle, Edit button, Delete button
- "Add Item" button

**Item form** (dialog or slide-over):
- Name, description, price, category select, availability toggle, image upload

**Image upload**:
- Use Supabase Storage
- Bucket: `menu-images` (create in migration or via Supabase dashboard)
- Upload via client component, get public URL, save to `menu_items.image_url`

```typescript
// Upload implementation in client component:
const { data } = await supabase.storage
  .from('menu-images')
  .upload(`${hotelId}/${Date.now()}-${file.name}`, file)
const { data: { publicUrl } } = supabase.storage
  .from('menu-images')
  .getPublicUrl(data.path)
```

**Server Actions: `src/lib/actions/admin-menu.ts`**:
```typescript
'use server'

// createMenuCategoryAction(name: string, sortOrder?: number)
// updateMenuCategoryAction(id: string, data: { name?, sortOrder? })
// deleteMenuCategoryAction(id: string)

// createMenuItemAction(data: { categoryId, name, description?, price, imageUrl?, isAvailable, sortOrder? })
// updateMenuItemAction(id: string, data: Partial<MenuItemFields>)
// toggleMenuItemAvailabilityAction(id: string, isAvailable: boolean)
// deleteMenuItemAction(id: string)
```

**All actions validate the resource belongs to the admin's hotel.**

---

## Room Management (Bonus — if time allows)

### `src/app/[locale]/(admin)/rooms/page.tsx`

Simple CRUD for rooms:
- List rooms with number, type, floor, active stays count
- Add room, edit room, delete room (only if no active stays)

Add this to the admin sidebar navigation if implemented.

---

## Admin Sidebar Navigation Component

### `src/components/admin/sidebar.tsx`

Responsive sidebar:
- Desktop: always visible, 240px wide
- Tablet: collapsible (toggle button)
- Mobile: drawer (Sheet component)

Navigation items with active state highlighting.

Hotel name displayed prominently at the top of the sidebar.

---

## Shared Admin Components

### `src/components/admin/stats-card.tsx`
Props: `title`, `value`, `icon`, `trend?`, `variant?: 'default' | 'warning' | 'danger'`

### `src/components/admin/data-table.tsx`
Generic sortable/filterable table with pagination. Build once, reuse across users/stays/operations pages.

### `src/components/admin/confirm-dialog.tsx`
Reusable confirmation dialog for destructive actions.
Props: `title`, `description`, `onConfirm`, `onCancel`, `variant?: 'destructive' | 'default'`

---

## Guest Dashboard (Agent Bonus)

While you're here, also implement the guest dashboard since it's closely related to admin data:

### `src/app/[locale]/(guest)/dashboard/page.tsx`

Server Component. Fetches:
1. Active stay details via `get_active_stay(guestId)` RPC
2. Recent orders (last 3)
3. Total expenses (from `expenses` view)
4. Active service requests

**Layout (mobile-first)**:
- Welcome card: "Welcome back, {name}! Room {number} · {checkIn} → {checkOut}"
- Quick actions grid (2x2): Room Service, Request Service, Chat, Expenses
- Recent orders (last 3 with status)
- No active stay state: show friendly message + contact info

---

## Quality Requirements

- All admin actions are server actions (no client-side DB access for mutations)
- Service role client ONLY used in server actions
- All operations scoped to admin's hotel (never expose other hotels' data)
- Confirmation dialogs before all destructive operations
- Loading states on all async actions
- Form validation with React Hook Form + Zod
- No TypeScript errors
- Responsive design (sidebar collapses on mobile)
- All text translated via next-intl
