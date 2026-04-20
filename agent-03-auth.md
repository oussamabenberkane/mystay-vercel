# Agent 03 — Authentication, Middleware, Role-based Routing

## Design System — Apply to All UI

**Tone**: Warm Luxury Hospitality — 5-star hotel feel. Elegant, premium, never cold or corporate.

**Colors**:
- Background: `#F8F0E8` (warm champagne) — use on all page backgrounds
- Primary / Text: `#1B2D5B` (deep navy) — headings, buttons, icons
- Accent: `#C9A84C` (warm gold) — active states, prices, eyebrow text, highlights
- Card: `#FFFFFF` with shadow `0 2px 16px rgba(27,45,91,0.08)`
- Muted text: `#7A8BA8`
- Border: `rgba(27,45,91,0.10)`

**Typography**:
- Headings, page titles, form titles: `font-heading` CSS class → Playfair Display serif (CSS variable already set up)
- Body, labels, inputs, buttons: Inter (default body font)
- Eyebrow / section label: `text-xs font-semibold uppercase tracking-widest` in gold `#C9A84C`

**Shape & Spacing**:
- Cards: `rounded-2xl` (16px), white bg, `card-warm` utility class
- Buttons: `rounded-xl`, `bg-[#1B2D5B] text-[#F8F0E8]` for primary, min height 48px
- Inputs: `rounded-xl border-[rgba(27,45,91,0.12)] bg-white focus:ring-[#C9A84C]`
- Generous padding — never cramped: `px-6 py-6` on cards, `space-y-4` between fields

**Auth pages specifically**:
- Background: warm champagne `#F8F0E8` — NOT dark slate (ignore the "dark slate gradient" instruction below, that is incorrect for this app)
- Centered card: white `rounded-3xl` with warm shadow, max-w-md, generous internal padding (`p-8`)
- Logo mark: navy `#1B2D5B` rounded square with gold `#C9A84C` "MS" monogram
- App name "My Stay" in Playfair Display, navy, below logo
- Tagline in muted `#7A8BA8`, Inter, small
- Submit button: full-width, navy bg, champagne text, `rounded-xl py-3`
- Links: gold `#C9A84C` color
- Error states: soft red tinted box (`bg-red-50 text-red-800 rounded-xl px-4 py-3`)
- Input labels: `text-xs font-semibold uppercase tracking-wider text-[#7A8BA8]`

**Already implemented** (do not recreate):
- `globals.css` — all CSS variables mapped to the brand palette
- Guest layout with warm bottom nav
- Staff layout with navy `#1B2D5B` sidebar
- Phase 2 screens (menu, cart, orders, staff orders) — use as visual reference for consistent style

---

## Context

You are building the auth layer for **My Stay**, a multi-tenant hotel guest experience SaaS platform.

Stack: Next.js 14 (App Router), Supabase Auth, next-intl (i18n with en/fr/ar), Tailwind CSS, shadcn/ui, Zustand, React Hook Form + Zod.

The project is already set up (Agent 02 ran before you). The database schema and RLS policies are in place (Agent 01 ran before you).

Working directory: `/home/ouss/Desktop/Coding/MyStay`

**Before starting**, read these files to understand the current state:
- `PLAN.md` — architecture overview
- `src/lib/supabase/client.ts` — browser client
- `src/lib/supabase/server.ts` — server client
- `src/middleware.ts` — existing middleware
- `src/lib/store/auth-store.ts` — Zustand store
- `src/lib/types/database.ts` — type definitions

---

## Your Task

Implement the complete authentication flow:
1. Login page
2. Signup page (with hotel slug entry for tenant resolution)
3. Password reset flow
4. Role-based redirect after login
5. Auth context provider
6. Logout functionality
7. Profile creation server action
8. Protected route middleware (already partially set up — refine it)

---

## Architecture Decisions

### How Multi-Tenancy Works at Signup
When a user signs up:
1. They enter their email, password, full name, phone, and **hotel slug** (e.g., `le-grand-hotel`)
2. The app looks up `hotels` by slug to get `hotel_id`
3. After Supabase Auth creates the user, a profile is created with `hotel_id` and `role = 'client'` by default
4. Admin and staff accounts are created by hotel admins (not via self-signup)
5. The hotel slug is stored in localStorage temporarily during the signup flow

### Role Resolution After Login
After login:
1. Fetch `profiles` row for `auth.uid()`
2. Store in Zustand `useAuthStore`
3. Redirect based on `role`:
   - `client` → `/{locale}/dashboard`
   - `staff` → `/{locale}/staff/orders`
   - `admin` → `/{locale}/admin/operations`

---

## Files to Create/Modify

### Server Actions: `src/lib/actions/auth.ts`

Implement these server actions:

```typescript
'use server'

// loginAction(formData: { email: string, password: string })
// - Signs in with Supabase Auth
// - Fetches profile to determine role
// - Returns { role, error }

// signupAction(formData: { email, password, fullName, phone, language, hotelSlug })
// - Validates hotel slug exists
// - Signs up with Supabase Auth
// - Creates profile row (role = 'client')
// - Returns { error }

// logoutAction()
// - Signs out via Supabase Auth
// - Redirects to /{locale}/login

// resetPasswordAction(formData: { email: string })
// - Sends password reset email via Supabase Auth
// - Returns { error }

// updatePasswordAction(formData: { password: string })
// - Updates password (called from reset link)
// - Returns { error }
```

Use the **server Supabase client** (from `src/lib/supabase/server.ts`) in server actions.

### Auth Forms with Validation (Zod):

#### Login schema:
```typescript
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})
```

#### Signup schema:
```typescript
const signupSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
  phone: z.string().optional(),
  language: z.enum(['en', 'fr', 'ar']),
  hotelSlug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
})
```

---

## Pages to Implement

### `src/app/[locale]/(auth)/login/page.tsx`

Features:
- Email + password form
- "Forgot password?" link → `/[locale]/forgot-password`
- "Sign up" link → `/[locale]/signup`
- Error display (invalid credentials, etc.)
- Loading state during submission
- After successful login: redirect based on role using `router.push`
- Fully translated (use `useTranslations` from next-intl)
- Mobile-first design using shadcn/ui Card, Input, Button, Label

The page should look clean and modern — centered card with hotel logo placeholder, app name "My Stay", tagline.

### `src/app/[locale]/(auth)/signup/page.tsx`

Features:
- Full name, email, password, phone, language select, hotel slug fields
- Hotel slug field with helper text explaining what it is
- Password strength indicator
- Terms acknowledgement checkbox
- Error display (hotel not found, email already exists, etc.)
- After successful signup: redirect to `/{locale}/dashboard`

### `src/app/[locale]/(auth)/forgot-password/page.tsx`

- Email field
- Submit → shows success message with instructions
- Back to login link

### `src/app/[locale]/(auth)/reset-password/page.tsx`

- New password + confirm password fields
- Called when user clicks reset link from email
- On success → redirect to login with success toast

---

## Auth Context Provider

### `src/components/providers/auth-provider.tsx`

A client component that:
1. On mount, calls `supabase.auth.getUser()` 
2. If user exists, fetches their profile from `profiles` table
3. Stores profile in `useAuthStore`
4. Listens to `supabase.auth.onAuthStateChange` for session updates
5. Handles the case where profile doesn't exist yet (e.g., mid-signup)

```tsx
'use client'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setProfile = useAuthStore(state => state.setProfile)
  // ... implementation
  return <>{children}</>
}
```

Wrap this in `src/app/[locale]/layout.tsx`.

---

## Layout Updates

### `src/app/[locale]/(auth)/layout.tsx`

Centered layout with:
- Background: warm champagne `#F8F0E8` (full-page background — not dark, not slate)
- Optional: a very subtle warm radial gradient from `#F8F0E8` to `#EEE4D8` for depth
- Card centered on screen: white `rounded-3xl` with `shadow-[0_4px_32px_rgba(27,45,91,0.10)]`, `max-w-md`, `p-8`
- App branding at top of card: gold/navy logo mark + "My Stay" in Playfair Display
- Language switcher in top-right corner: small pill-shaped switcher in navy

### Update `src/app/[locale]/layout.tsx`

Wrap with `AuthProvider` and `NextIntlClientProvider`.

Handle RTL direction for Arabic:
```tsx
<html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
```

---

## Middleware Refinement

Update `src/middleware.ts` to handle:
1. `/` root path → detect locale and redirect to login or dashboard
2. Role-based path protection:
   - `/[locale]/dashboard` and all `/[locale]/(guest)/*` routes → require `role === 'client'`
   - `/[locale]/staff/*` routes → require `role === 'staff'`
   - `/[locale]/admin/*` routes → require `role === 'admin'`
3. If role doesn't match path → redirect to their correct dashboard
4. Middleware should be efficient — avoid redundant profile fetches

Note: Middleware runs on Edge. The profile check requires a DB query. Use `supabase.from('profiles').select('role').eq('id', user.id).single()` — this is acceptable for MVP scale.

---

## Logout Button Component

### `src/components/shared/logout-button.tsx`

```tsx
'use client'
// Button that calls logoutAction()
// Shows loading state
// Can be used in any layout (guest, staff, admin)
```

---

## Error Handling

All auth errors should show user-friendly messages (not Supabase error codes). Create a mapping:
- `Invalid login credentials` → "Incorrect email or password"
- `User already registered` → "An account with this email already exists"
- `Email not confirmed` → "Please verify your email before logging in"
- Hotel slug not found → "Hotel not found. Please check your hotel code."

---

## Testing Notes

After implementing, verify manually:
1. Guest can sign up with `le-grand-hotel` slug
2. After signup → redirected to `/en/dashboard`
3. Login with existing staff account → redirected to `/en/staff/orders`
4. Login with admin account → redirected to `/en/admin/operations`
5. Guest trying to access `/en/staff/orders` → redirected to `/en/dashboard`
6. Unauthenticated user accessing `/en/dashboard` → redirected to `/en/login`
7. Logout clears session and redirects to `/en/login`
8. Password reset email flow works

---

## Quality Requirements

- All forms use React Hook Form + Zod validation
- All strings are translated (no hardcoded English text)
- Mobile-first responsive design
- No TypeScript errors
- Proper error boundaries
- Loading states on all async operations
