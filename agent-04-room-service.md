# Agent 04 — Room Service (Menu, Cart, Orders, Real-time)

## Context

You are building the room service feature for **My Stay**, a multi-tenant hotel SaaS platform.

Stack: Next.js 14 (App Router), Supabase (PostgreSQL + Realtime), Tailwind CSS, shadcn/ui, Zustand, next-intl.

**Prerequisites**: Agents 01, 02, and 03 have already run. The project is set up, database schema exists, auth and routing work correctly.

Working directory: `/home/ouss/Desktop/Coding/MyStay`

**Before starting**, read:
- `PLAN.md` — architecture overview and schema
- `src/lib/types/database.ts` — all type definitions
- `src/lib/supabase/client.ts` and `server.ts`
- `src/lib/store/auth-store.ts` — Zustand auth store
- Any existing files in `src/app/[locale]/(guest)/menu/` and `src/app/[locale]/(guest)/orders/`
- Any existing files in `src/app/[locale]/(staff)/orders/`

---

## Your Task

Implement the complete room service system end-to-end:
- Guest: browse menu → add to cart → place order → track order status
- Staff: receive orders in real-time → update order status
- Real-time: order updates propagate instantly to both guest and staff

---

## Data Flow

```
Guest:
  Browse menu → Add items to cart (client-side state) →
  Review cart → Confirm order →
  Server action creates order + order_items rows →
  Realtime subscription shows status updates

Staff:
  Real-time subscription to hotel's orders →
  Click order → Update status →
  Server action updates orders.status →
  Guest sees status change instantly
```

---

## Cart State Management

### `src/lib/store/cart-store.ts`

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type CartItem = {
  menuItemId: string
  name: string
  price: number
  quantity: number
  imageUrl: string | null
}

type CartStore = {
  items: CartItem[]
  hotelId: string | null
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (menuItemId: string) => void
  updateQuantity: (menuItemId: string, quantity: number) => void
  clearCart: () => void
  total: () => number
  itemCount: () => number
}
```

Persist cart in localStorage (with `persist` middleware). Clear cart after order is placed successfully.

---

## Server Actions: `src/lib/actions/room-service.ts`

```typescript
'use server'

// placeOrderAction(items: { menuItemId, quantity, unitPrice }[], notes: string, stayId: string)
// - Validates guest has an active stay in the hotel
// - Validates all menu items are available and belong to the hotel
// - Calculates total_amount
// - Creates order row + order_items rows in a transaction
// - Returns { orderId, error }

// updateOrderStatusAction(orderId: string, status: OrderStatus)
// - Validates caller is staff or admin
// - Validates the order belongs to caller's hotel
// - Updates orders.status and updated_at
// - Returns { error }

// getOrdersForStayAction(stayId: string)
// - Returns orders with order_items and menu_item names for the stay
// - Used for initial server-side render of guest orders page
```

Use the server Supabase client. Validate all inputs. No direct table access without RLS verification.

---

## Guest Pages

### `src/app/[locale]/(guest)/menu/page.tsx` — Menu Page

Server Component that:
1. Fetches `menu_categories` for the guest's hotel
2. Fetches all available `menu_items` for the hotel
3. Groups items by category
4. Renders `<MenuCategorySection>` for each category

### `src/app/[locale]/(guest)/menu/page.tsx` Layout

Mobile-first design:
- Sticky header: "Room Service" title + cart icon with item count badge
- Horizontal scrollable category tabs (sticky below header)
- Vertical list of items per category section (with smooth scroll to section)
- Each item card:
  - Item image (or placeholder)
  - Name, description (truncated), price
  - "+" button to add to cart (with quantity control if already in cart)
- Floating cart button at bottom (when cart has items): "View Cart (N) — €X.XX"

### `src/app/[locale]/(guest)/menu/cart/page.tsx` — Cart Page

Client Component:
- List of cart items with quantity +/- controls and remove button
- Order notes textarea
- Order total
- "Place Order" button → calls `placeOrderAction`
- Loading state during order placement
- On success → redirect to orders page with success toast

### `src/app/[locale]/(guest)/orders/page.tsx` — Guest Orders Page

Server Component (initial load) + Client Component (real-time updates):
1. Server fetches current orders for guest's active stay
2. Client subscribes to Supabase Realtime for order status updates
3. Shows each order with:
   - Order #ID (last 8 chars), date/time
   - Status badge (with color coding)
   - Expandable order items list
   - Total amount

**Real-time subscription** (client component):
```typescript
const channel = supabase
  .channel(`orders:${stayId}`)
  .on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'orders', filter: `stay_id=eq.${stayId}` },
    (payload) => {
      // Update order status in local state
    }
  )
  .subscribe()
```

---

## Staff Pages

### `src/app/[locale]/(staff)/orders/page.tsx` — Staff Orders Dashboard

Client Component with real-time subscription:
1. Initial server-side load of hotel's active orders (pending, confirmed, preparing, delivering)
2. Real-time subscription to all order changes for the hotel
3. Orders grouped by status or sorted by created_at DESC
4. Filter tabs: All / Pending / In Progress / Completed

**Real-time subscription for staff**:
```typescript
const channel = supabase
  .channel(`hotel-orders:${hotelId}`)
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'orders', filter: `hotel_id=eq.${hotelId}` },
    (payload) => {
      // Add new order or update existing order in state
    }
  )
  .subscribe()
```

Each order card shows:
- Room number (joined from stays + rooms)
- Guest name
- Order items (truncated list)
- Time since placed
- Status badge
- Status update buttons (contextual):
  - Pending → "Confirm" button
  - Confirmed → "Start Preparing" button
  - Preparing → "Out for Delivery" button
  - Delivering → "Mark Delivered" button
  - Any status → "Cancel" button (with confirmation)

### `src/app/[locale]/(staff)/orders/[id]/page.tsx` — Order Detail (optional if time allows)

Full order detail view for staff.

---

## Shared Components

### `src/components/guest/menu-item-card.tsx`
- Image, name, description, price
- Add to cart / quantity control
- Shows dietary tags if any (future-proof, optional)

### `src/components/guest/cart-button.tsx`
- Floating button showing item count and total
- Navigates to cart page
- Only shown when cart has items

### `src/components/guest/order-status-badge.tsx`
- Color-coded badge per status:
  - `pending` → yellow
  - `confirmed` → blue
  - `preparing` → orange
  - `delivering` → purple
  - `delivered` → green
  - `cancelled` → red
- Animated pulse for in-progress states

### `src/components/staff/order-card.tsx`
- Full order card for staff view
- Status update buttons
- Shows guest name, room number, items, total, time

### `src/components/staff/order-status-selector.tsx`
- Dropdown or button group for status transitions
- Only shows valid next statuses (not backwards transitions)
- Confirms before cancellation

---

## Real-time Architecture

**Two channels are used**:
1. `orders:${stayId}` — guest subscribes to their own orders' updates
2. `hotel-orders:${hotelId}` — staff subscribes to all hotel orders

Both use `postgres_changes` on the `orders` table.

**Cleanup**: Always unsubscribe on component unmount:
```typescript
useEffect(() => {
  const channel = supabase.channel(...)
  channel.subscribe()
  return () => { supabase.removeChannel(channel) }
}, [stayId])
```

---

## Data Requirements

### Room number on staff view

Staff need to see the room number. Join strategy:
- `orders` → `stays` → `rooms`
- Fetch this server-side for the initial load
- For real-time updates, when a new order arrives, fetch room details separately

Create an RPC function if the join is complex, or use a Supabase nested select:
```typescript
supabase
  .from('orders')
  .select(`
    *,
    order_items(*, menu_items(name)),
    stays(*, rooms(number, type)),
    profiles(full_name)
  `)
  .eq('hotel_id', hotelId)
  .in('status', ['pending', 'confirmed', 'preparing', 'delivering'])
  .order('created_at', { ascending: false })
```

---

## UI/UX Requirements

- Mobile-first for guest views (thumb-friendly tap targets, bottom navigation)
- Desktop-optimized for staff views (table/card layout with good information density)
- Toast notifications on order placement success/failure
- Optimistic UI: update cart immediately on add (don't wait for server)
- Skeleton loading states on all data fetches
- Empty states with helpful messages (e.g., "No orders yet — browse our menu")
- All text translated via next-intl

---

## Quality Requirements

- No TypeScript errors
- No `any` types — use types from `database.ts`
- Real-time subscriptions properly cleaned up on unmount
- Cart persisted across page navigation
- Cart cleared on logout
- Server actions validate hotel_id scope (prevent cross-tenant order placement)
