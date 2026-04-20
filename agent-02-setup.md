# Agent 02 — Next.js Project Setup, Dependencies, Structure, i18n, PWA

## Context

You are initializing the frontend for **My Stay**, a multi-tenant hotel guest experience SaaS platform.

Stack: Next.js 14 (App Router), Supabase, Tailwind CSS, shadcn/ui, next-intl (i18n), next-pwa (PWA).

The working directory is `/home/ouss/Desktop/Coding/MyStay`. The Next.js app will be created directly in this directory (not a subdirectory).

**Important**: The directory already contains `prompt.md`, `spec.md`, `PLAN.md`, and `agent-*.md` files. These are planning documents — do not delete or modify them.

---

## Your Task

Set up the complete Next.js project from scratch including all configuration, dependencies, folder structure, Supabase client setup, i18n, and PWA configuration. Write all files to disk.

---

## Step 1: Initialize Next.js

Run the following in `/home/ouss/Desktop/Coding/MyStay`:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git
```

When prompted, answer:
- Use TypeScript: Yes
- Use ESLint: Yes
- Use Tailwind CSS: Yes
- Use `src/` directory: Yes
- Use App Router: Yes
- Import alias: @/*

---

## Step 2: Install Dependencies

```bash
# Supabase
npm install @supabase/supabase-js @supabase/ssr

# i18n
npm install next-intl

# PWA
npm install next-pwa

# UI components
npm install class-variance-authority clsx tailwind-merge lucide-react
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select
npm install @radix-ui/react-toast @radix-ui/react-label @radix-ui/react-separator
npm install @radix-ui/react-avatar @radix-ui/react-badge @radix-ui/react-progress

# Forms
npm install react-hook-form @hookform/resolvers zod

# State management
npm install zustand

# Date utilities
npm install date-fns

# Web push (for push notification subscription)
npm install web-push
npm install --save-dev @types/web-push
```

---

## Step 3: Initialize shadcn/ui

```bash
npx shadcn@latest init
```

When prompted:
- Style: Default
- Base color: Slate
- CSS variables: Yes

Then add these components:
```bash
npx shadcn@latest add button card input label textarea select badge avatar separator toast dialog dropdown-menu progress skeleton sheet tabs
```

---

## Step 4: Environment Variables

Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:admin@mystay.app
```

Create `.env.example` with the same keys but empty values (for documentation).

---

## Step 5: Supabase Client Setup

### `src/lib/supabase/client.ts` — Browser client
```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### `src/lib/supabase/server.ts` — Server client (for Server Components and Server Actions)
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/types/database'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

### `src/lib/supabase/middleware.ts` — Middleware client
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/types/database'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  return { supabaseResponse, user, supabase }
}
```

---

## Step 6: Middleware

Create `src/middleware.ts`:

```typescript
import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import createIntlMiddleware from 'next-intl/middleware'
import { locales, defaultLocale } from '@/lib/i18n/config'

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
})

const publicPaths = ['/login', '/signup', '/forgot-password']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Handle i18n first
  const intlResponse = intlMiddleware(request)

  // Strip locale prefix for path matching
  const pathnameWithoutLocale = pathname.replace(/^\/(en|fr|ar)/, '') || '/'

  const { supabaseResponse, user, supabase } = await updateSession(request)

  const isPublicPath = publicPaths.some(p => pathnameWithoutLocale.startsWith(p))
  const isAuthPath = pathnameWithoutLocale === '/' || isPublicPath

  if (!user && !isPublicPath && pathnameWithoutLocale !== '/') {
    const locale = pathname.split('/')[1] || defaultLocale
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/login`
    return NextResponse.redirect(url)
  }

  if (user && isAuthPath) {
    // Fetch role and redirect
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const locale = pathname.split('/')[1] || defaultLocale
    const url = request.nextUrl.clone()

    if (profile?.role === 'client') {
      url.pathname = `/${locale}/dashboard`
    } else if (profile?.role === 'staff') {
      url.pathname = `/${locale}/staff/orders`
    } else if (profile?.role === 'admin') {
      url.pathname = `/${locale}/admin/operations`
    }

    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

---

## Step 7: i18n Configuration

### `src/lib/i18n/config.ts`
```typescript
export const locales = ['en', 'fr', 'ar'] as const
export type Locale = typeof locales[number]
export const defaultLocale: Locale = 'en'
```

### `src/lib/i18n/request.ts`
```typescript
import { getRequestConfig } from 'next-intl/server'
import { locales } from './config'

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale
  if (!locale || !locales.includes(locale as any)) {
    locale = 'en'
  }
  return {
    locale,
    messages: (await import(`../../../messages/${locale}.json`)).default,
  }
})
```

### `messages/en.json`
Create a comprehensive English translation file with keys for:
- `nav.*` — navigation labels
- `auth.*` — login, signup, logout labels
- `guest.*` — guest interface labels (dashboard, menu, orders, requests, chat, expenses)
- `staff.*` — staff interface labels
- `admin.*` — admin interface labels
- `common.*` — shared labels (loading, error, save, cancel, confirm, etc.)
- `status.*` — order/request status labels

### `messages/fr.json` — French translations for same keys
### `messages/ar.json` — Arabic translations for same keys

Make translations realistic and complete (not placeholder text).

---

## Step 8: Type Definitions

### `src/lib/types/database.ts`
Create a TypeScript type file representing the Supabase database schema. This will be replaced later by auto-generated types from `supabase gen types`, but create a placeholder that matches the schema from Agent 01:

```typescript
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      hotels: {
        Row: { id: string; name: string; slug: string; logo_url: string | null; created_at: string }
        Insert: { id?: string; name: string; slug: string; logo_url?: string | null; created_at?: string }
        Update: { id?: string; name?: string; slug?: string; logo_url?: string | null }
      }
      profiles: {
        Row: { id: string; hotel_id: string; role: 'client' | 'staff' | 'admin'; full_name: string; phone: string | null; language: string; created_at: string }
        Insert: { id: string; hotel_id: string; role: 'client' | 'staff' | 'admin'; full_name: string; phone?: string | null; language?: string }
        Update: { full_name?: string; phone?: string | null; language?: string }
      }
      rooms: {
        Row: { id: string; hotel_id: string; number: string; type: string; floor: number | null; created_at: string }
        Insert: { id?: string; hotel_id: string; number: string; type: string; floor?: number | null }
        Update: { number?: string; type?: string; floor?: number | null }
      }
      stays: {
        Row: { id: string; hotel_id: string; guest_id: string; room_id: string; check_in: string; check_out: string; status: 'active' | 'archived'; created_at: string }
        Insert: { id?: string; hotel_id: string; guest_id: string; room_id: string; check_in: string; check_out: string; status?: 'active' | 'archived' }
        Update: { status?: 'active' | 'archived'; check_out?: string }
      }
      menu_categories: {
        Row: { id: string; hotel_id: string; name: string; sort_order: number; created_at: string }
        Insert: { id?: string; hotel_id: string; name: string; sort_order?: number }
        Update: { name?: string; sort_order?: number }
      }
      menu_items: {
        Row: { id: string; hotel_id: string; category_id: string; name: string; description: string | null; price: number; image_url: string | null; is_available: boolean; sort_order: number; created_at: string }
        Insert: { id?: string; hotel_id: string; category_id: string; name: string; description?: string | null; price: number; image_url?: string | null; is_available?: boolean; sort_order?: number }
        Update: { name?: string; description?: string | null; price?: number; image_url?: string | null; is_available?: boolean; sort_order?: number; category_id?: string }
      }
      orders: {
        Row: { id: string; hotel_id: string; stay_id: string; guest_id: string; status: 'pending' | 'confirmed' | 'preparing' | 'delivering' | 'delivered' | 'cancelled'; total_amount: number; notes: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; hotel_id: string; stay_id: string; guest_id: string; status?: string; total_amount: number; notes?: string | null }
        Update: { status?: string; notes?: string | null }
      }
      order_items: {
        Row: { id: string; order_id: string; menu_item_id: string; quantity: number; unit_price: number; created_at: string }
        Insert: { id?: string; order_id: string; menu_item_id: string; quantity: number; unit_price: number }
        Update: never
      }
      service_requests: {
        Row: { id: string; hotel_id: string; stay_id: string; guest_id: string; type: 'cleaning' | 'towels' | 'maintenance' | 'other'; description: string | null; priority: 'normal' | 'urgent'; status: 'pending' | 'in_progress' | 'completed' | 'cancelled'; created_at: string; updated_at: string }
        Insert: { id?: string; hotel_id: string; stay_id: string; guest_id: string; type: string; description?: string | null; priority?: string; status?: string }
        Update: { status?: string; priority?: string; description?: string | null }
      }
      messages: {
        Row: { id: string; hotel_id: string; stay_id: string; sender_id: string; content: string; created_at: string }
        Insert: { id?: string; hotel_id: string; stay_id: string; sender_id: string; content: string }
        Update: never
      }
      push_subscriptions: {
        Row: { id: string; user_id: string; subscription: Json; created_at: string }
        Insert: { id?: string; user_id: string; subscription: Json }
        Update: { subscription?: Json }
      }
    }
    Views: {
      expenses: {
        Row: { id: string; hotel_id: string; stay_id: string; guest_id: string; amount: number; status: string; created_at: string }
      }
    }
    Functions: {
      get_active_stay: {
        Args: { p_guest_id: string }
        Returns: Array<{ id: string; hotel_id: string; room_id: string; check_in: string; check_out: string; status: string; room_number: string; room_type: string; room_floor: number | null }>
      }
      get_hotel_stats: {
        Args: { p_hotel_id: string }
        Returns: Json
      }
    }
  }
}
```

---

## Step 9: App Router Structure

Create the full folder structure with placeholder files. Each file should have a minimal working implementation — not just empty files.

### Root layout: `src/app/layout.tsx`
```tsx
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'My Stay',
  description: 'Hotel Guest Experience Platform',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'My Stay' },
}

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

### Locale layout: `src/app/[locale]/layout.tsx`
Wraps with next-intl provider. Handles RTL for Arabic locale.

### Route groups and their layouts:
- `src/app/[locale]/(auth)/layout.tsx` — centered auth layout
- `src/app/[locale]/(guest)/layout.tsx` — guest shell with bottom nav
- `src/app/[locale]/(staff)/layout.tsx` — staff shell with sidebar
- `src/app/[locale]/(admin)/layout.tsx` — admin shell with sidebar

Create placeholder `page.tsx` files (returning simple `<div>Page name</div>`) for every route listed in PLAN.md.

---

## Step 10: Utility Files

### `src/lib/utils/cn.ts`
```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### `src/lib/utils/format.ts`
Helpers for formatting currency, dates, and status labels.

---

## Step 11: PWA Configuration

### `next.config.ts`
```typescript
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'
import withPWA from 'next-pwa'

const withNextIntl = createNextIntlPlugin('./src/lib/i18n/request.ts')

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
}

export default pwaConfig(withNextIntl(nextConfig))
```

### `public/manifest.json`
```json
{
  "name": "My Stay",
  "short_name": "My Stay",
  "description": "Hotel Guest Experience Platform",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#0f172a",
  "icons": [
    { "src": "/icons/icon-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512x512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Create placeholder icon PNGs (simple colored squares) at `public/icons/icon-192x192.png` and `public/icons/icon-512x512.png`.

### `public/sw.js` — Service Worker (placeholder)
```javascript
// Service worker for My Stay PWA
// Push notification handling will be implemented in agent-06
self.addEventListener('push', function(event) {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      data: data.data || {},
    })
  )
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data.url || '/'))
})
```

---

## Step 12: Zustand Store

### `src/lib/store/auth-store.ts`
```typescript
import { create } from 'zustand'

type Profile = {
  id: string
  hotel_id: string
  role: 'client' | 'staff' | 'admin'
  full_name: string
  phone: string | null
  language: string
}

type AuthStore = {
  profile: Profile | null
  setProfile: (profile: Profile | null) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
}))
```

---

## Final Instructions

1. All files must be written to disk in `/home/ouss/Desktop/Coding/MyStay/`
2. Run `npm install` after creating package.json dependencies
3. Ensure TypeScript compiles without errors (`npx tsc --noEmit`)
4. Do NOT implement any feature logic — that is handled by later agents
5. Do NOT modify `prompt.md`, `spec.md`, `PLAN.md`, or `agent-*.md` files
6. After setup, run `npm run build` to verify the baseline compiles correctly and fix any configuration errors
