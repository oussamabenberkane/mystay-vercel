# Agent 06 — Real-time Chat + Push Notifications

## Design System — Apply to All UI

**Tone**: Warm Luxury Hospitality — the chat should feel like a concierge conversation, not a tech support ticket. Warm, personal, premium.

**Colors**:
- Page/shell background: `#F8F0E8` (warm champagne)
- Primary / navy: `#1B2D5B` — headers, guest message bubbles, send button
- Accent / gold: `#C9A84C` — online indicator border, header accent, active conversation highlight
- Card / panel background: `#FFFFFF`
- Muted text: `#7A8BA8`
- Border: `rgba(27,45,91,0.10)`

**Typography**:
- Header title (e.g., "Hotel Concierge"): `font-heading` → Playfair Display serif
- Eyebrow labels: `text-xs font-semibold uppercase tracking-widest text-[#C9A84C]`
- Message text, timestamps, sender names: Inter

**Message Bubbles**:
- **Guest messages** (isOwn): `bg-[#1B2D5B] text-[#F8F0E8]`, `rounded-2xl rounded-br-sm`, right-aligned
- **Staff/Hotel messages**: `bg-white text-[#1B2D5B]`, `rounded-2xl rounded-bl-sm`, left-aligned, with warm shadow `shadow-[0_1px_6px_rgba(27,45,91,0.07)]`
- Timestamp: `text-[10px] text-[#7A8BA8]`, shown below bubble
- Sender name (staff messages only): `text-[11px] font-semibold text-[#C9A84C]` above bubble

**Chat header**:
- White bg with warm shadow, hotel name in Playfair navy, "Hotel Concierge" eyebrow in gold
- Online indicator: pulsing green dot (same pattern as the Live indicator in staff orders)

**Input bar**:
- White bg, `rounded-2xl border-[rgba(27,45,91,0.1)]` input
- Send button: navy `#1B2D5B` `rounded-xl`, arrow icon in gold or white

**Staff two-panel layout**:
- Left panel (conversation list): white bg, `border-r border-[rgba(27,45,91,0.08)]`
- Active conversation item: gold left border `#C9A84C`, navy text, champagne bg
- Unread indicator: gold dot `#C9A84C`
- Right panel: champagne `#F8F0E8` bg for the message area, white for the input bar

**Push permission prompt**:
- Subtle warm banner: white `rounded-2xl` card with warm shadow — NOT a generic blue info banner
- Bell icon in gold, navy text, gold "Enable" button, muted "Not now" text link

**Already implemented** (do not recreate):
- `globals.css` — all design tokens as CSS variables
- Guest layout with warm bottom nav
- Staff layout with navy `#1B2D5B` sidebar
- Phase 2 screens (menu, cart, orders) — use as visual reference

---

## Context

You are building the real-time chat system and push notifications for **My Stay**, a multi-tenant hotel SaaS platform.

Stack: Next.js 14 (App Router), Supabase (PostgreSQL + Realtime), Web Push API, Tailwind CSS, shadcn/ui, Zustand, next-intl.

**Prerequisites**: Agents 01, 02, and 03 have already run. The project is set up, database schema exists, auth and routing work correctly.

Working directory: `/home/ouss/Desktop/Coding/MyStay`

**Before starting**, read:
- `PLAN.md` — architecture overview and schema
- `src/lib/types/database.ts` — type definitions
- `src/lib/supabase/client.ts` and `server.ts`
- `src/lib/store/auth-store.ts`
- `public/sw.js` — existing service worker stub

---

## Feature Overview

### Chat Model (Broadcast per hotel)
- Guest sends message → associated with their `stay_id` and `hotel_id`
- Staff sees messages from all guests in their hotel (grouped by stay/room)
- Guest sees only their own conversation thread
- All messages are persisted in the `messages` table
- Real-time via Supabase Realtime `postgres_changes`

### Push Notifications
- Web Push (PWA) using VAPID keys
- Subscriptions stored in `push_subscriptions` table
- Sent via Supabase Edge Function
- Triggered on: new chat message (when recipient is offline), order status update, new service request (for staff)

---

## Part 1: Chat

### Server Actions: `src/lib/actions/chat.ts`

```typescript
'use server'

// sendMessageAction(content: string, stayId: string)
// - Validates caller belongs to the hotel
// - Validates content length (1-1000 chars)
// - Inserts into messages table
// - Returns { messageId, error }

// getMessagesForStayAction(stayId: string, limit: number = 50)
// - Returns messages for the stay with sender profile (full_name, role)
// - Ordered by created_at ASC
// - Used for initial server-side load

// getConversationsForStaffAction()
// - Returns latest message per stay for the hotel
// - Grouped by stay, showing room number, guest name, last message, timestamp
// - Used for staff conversation list
```

---

### Guest Chat Page: `src/app/[locale]/(guest)/chat/page.tsx`

A single-thread chat UI (guest always talks to "Hotel Staff").

**Layout (mobile messaging app style)**:
- Header: "Hotel Concierge" with hotel name, online indicator
- Message list (scrollable, newest at bottom)
- Input bar pinned to bottom (above mobile keyboard)

**Message bubbles**:
- Guest messages: right-aligned, primary color bubble
- Staff messages: left-aligned, gray bubble
- Show sender name on staff messages
- Show timestamp (time only, or "Yesterday" etc.)
- Group consecutive messages from same sender

**Real-time subscription**:
```typescript
const channel = supabase
  .channel(`chat:${stayId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `stay_id=eq.${stayId}`,
    },
    (payload) => {
      // Append new message to state
      // Auto-scroll to bottom
    }
  )
  .subscribe()
```

**Input bar**:
- Textarea (auto-expand, max 3 lines)
- Send button (or Enter key, Shift+Enter for newline)
- Disable send when empty or loading
- Optimistic send: show message immediately, mark as "sending", update on confirmation

**Initial load**: Fetch last 50 messages server-side, render them, then attach realtime subscription for new ones.

---

### Staff Chat Page: `src/app/[locale]/(staff)/chat/page.tsx`

**Two-panel layout** (desktop):
- Left panel: conversation list (one per active stay)
- Right panel: active conversation thread

**Mobile**: show list first, tap to open thread (back button to return to list)

**Conversation list** (left panel):
- Each item: Room number, guest name, last message preview, timestamp
- Sorted by latest message DESC
- Unread indicator (bold + blue dot) when new message arrives
- Real-time update: conversation moves to top when new message arrives

**Thread panel** (right panel):
- Same message bubble UI as guest chat
- Staff sends messages that appear in the guest's chat
- Header shows: Room number, guest name, check-in/check-out dates

**Staff real-time subscription** (all hotel messages):
```typescript
const channel = supabase
  .channel(`hotel-chat:${hotelId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `hotel_id=eq.${hotelId}`,
    },
    (payload) => {
      // Update conversation list
      // If active conversation matches stay_id, append to thread
    }
  )
  .subscribe()
```

---

### Chat Components

#### `src/components/shared/message-bubble.tsx`
Props: `content`, `senderName`, `senderRole`, `createdAt`, `isOwn`

#### `src/components/shared/message-input.tsx`
Props: `onSend`, `disabled`
Auto-growing textarea with send button. Handles Enter/Shift+Enter.

#### `src/components/staff/conversation-list.tsx`
Props: `conversations`, `activeStayId`, `onSelect`
List of conversations with unread indicators.

#### `src/components/staff/chat-panel.tsx`
Full chat thread for a specific stay.

---

## Part 2: Push Notifications

### VAPID Key Generation

Add a script to generate VAPID keys (run once during setup):
```bash
# In package.json scripts:
"generate-vapid": "node scripts/generate-vapid-keys.js"
```

Create `scripts/generate-vapid-keys.js`:
```javascript
const webpush = require('web-push')
const keys = webpush.generateVAPIDKeys()
console.log('NEXT_PUBLIC_VAPID_PUBLIC_KEY=' + keys.publicKey)
console.log('VAPID_PRIVATE_KEY=' + keys.privateKey)
```

### Service Worker Update: `public/sw.js`

Expand the existing service worker stub:
```javascript
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})

self.addEventListener('push', function(event) {
  if (!event.data) return
  const data = event.data.json()
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
    actions: data.actions || [],
  }
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      const url = event.notification.data.url
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
```

### Push Subscription Hook: `src/hooks/use-push-notifications.ts`

```typescript
'use client'

export function usePushNotifications() {
  // 1. Check if browser supports push notifications
  // 2. Check if permission is granted
  // 3. Subscribe to push notifications
  // 4. Save subscription to push_subscriptions table
  // 5. Return { isSupported, isSubscribed, subscribe, unsubscribe }
}
```

Implementation:
```typescript
async function subscribe() {
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
  })
  // Save to Supabase
  await supabase.from('push_subscriptions').upsert({
    user_id: profile.id,
    subscription: subscription.toJSON(),
  })
}
```

### Push Notification Permission Component: `src/components/shared/push-permission-prompt.tsx`

A subtle banner (not a modal) that appears once, asking the user to enable notifications.
- "Enable notifications to stay updated on your orders and messages"
- "Enable" button → calls `subscribe()`
- "Not now" button → dismiss and don't show again (store in localStorage)

Show this in the guest and staff layouts after login.

### API Route: `src/app/api/push/route.ts`

An internal API route that receives a push trigger and sends the notification:

```typescript
import webpush from 'web-push'

export async function POST(request: Request) {
  const { userId, title, body, url } = await request.json()
  
  // Fetch subscription from push_subscriptions
  // Send push notification via webpush.sendNotification
  // Return success/failure
}
```

This route is called internally (from server actions or edge functions), not exposed publicly.

**Note**: For MVP, push notifications are triggered from server actions (e.g., after `updateOrderStatusAction`). Not a full edge function setup — just an internal API route call.

### Trigger Push Notifications From Server Actions

In the relevant server actions (from agents 04 and 05), add push notification triggers:

**When order status changes** (in `updateOrderStatusAction`):
```typescript
// After updating order status, fetch guest's push subscription
// Call /api/push with: userId = order.guest_id, title = "Order Update", body = `Your order is now ${status}`
```

**When a new message arrives** (not needed — guest is usually on the page. Push is for when they're away):
After `sendMessageAction`, check if the recipient has a push subscription and send.

**When a new urgent service request is submitted** (notify staff):
After `createServiceRequestAction` with `priority = 'urgent'`, notify all staff in the hotel.

---

## Notification Content Guidelines

| Trigger | Title | Body |
|---|---|---|
| Order confirmed | "Order Confirmed ✓" | "Your room service order is being prepared" |
| Order delivering | "On the Way! 🚀" | "Your order is on its way to your room" |
| Order delivered | "Order Delivered ✓" | "Enjoy your meal! Your order has arrived" |
| New chat message (to guest) | "Message from Hotel" | "{senderName}: {messagePreview}" |
| New chat message (to staff) | "New Guest Message" | "Room {roomNumber}: {messagePreview}" |
| Urgent service request (to staff) | "⚠️ Urgent Request" | "Room {roomNumber} needs {requestType}" |
| Request in progress | "Request Accepted" | "Your {requestType} request is being handled" |

---

## Quality Requirements

- Chat must feel instant — no visible lag between send and display
- Messages must not duplicate (handle case where optimistic update + realtime both fire)
- Real-time channels cleaned up on unmount and on page navigation
- Push notifications work on mobile Chrome, Safari (iOS 16.4+), Firefox
- Service worker registered and active before subscription attempt
- Gracefully degrade if push not supported (no errors, just no prompt)
- No TypeScript errors
- All UI strings translated via next-intl
