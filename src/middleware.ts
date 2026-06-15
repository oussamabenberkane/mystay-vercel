import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import createIntlMiddleware from 'next-intl/middleware'
import { locales, defaultLocale } from '@/lib/i18n/config'

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
})

const publicPaths = ['/login', '/signup', '/forgot-password', '/reset-password']

// Pre-auth surfaces reachable while logged out: the splash (locale root '/')
// and the marketing landing page. Authenticated users are still redirected to
// their role home below.
const preAuthPaths = ['/', '/landing']

type Role = 'client' | 'staff' | 'admin'

function getRoleRedirect(role: Role, locale: string): string {
  if (role === 'staff') return `/${locale}/staff/orders`
  if (role === 'admin') return `/${locale}/admin/operations`
  return `/${locale}/dashboard`
}

function getRequiredRole(path: string): Role | null {
  if (path.startsWith('/staff/')) return 'staff'
  if (path.startsWith('/admin/')) return 'admin'
  if (path.startsWith('/dashboard') || path.startsWith('/menu') || path.startsWith('/orders') || path.startsWith('/requests') || path.startsWith('/chat') || path.startsWith('/expenses') || path.startsWith('/feedback') || path.startsWith('/info') || path.startsWith('/events')) return 'client'
  return null
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Never run auth-redirect / intl logic for API route handlers. The matcher
  // already excludes `/api`, but this is a defensive backstop so an
  // unauthenticated provider callback (e.g. the Chargily payment webhook) can
  // never be redirected to /login if the matcher is ever changed.
  if (pathname.startsWith('/api')) return NextResponse.next()

  const firstSegment = pathname.split('/')[1] || ''
  const locale = (locales as readonly string[]).includes(firstSegment) ? firstSegment : defaultLocale

  // Strip locale prefix for path matching
  const pathnameWithoutLocale = pathname.replace(/^\/(en|fr|ar)/, '') || '/'

  // Skip auth logic for server action calls — they POST to the page path and must not be redirected
  const isServerAction = request.method === 'POST' && request.headers.has('next-action')
  if (isServerAction) return intlMiddleware(request)

  const { supabaseResponse, user, supabase } = await updateSession(request)

  const isPublicPath = publicPaths.some(p => pathnameWithoutLocale.startsWith(p))
  const isPreAuthPath =
    pathnameWithoutLocale === '/' ||
    preAuthPaths.some(p => p !== '/' && pathnameWithoutLocale.startsWith(p))

  // Redirect unauthenticated users to login (splash + landing stay reachable)
  if (!user && !isPublicPath && !isPreAuthPath) {
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/login`
    return NextResponse.redirect(url)
  }

  if (user) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = (profileData as { role: Role } | null)?.role

    // Only enforce redirects when we successfully retrieved the role.
    // If the DB is unavailable and role is undefined, let the request
    // pass through — page-level auth guards will handle it, and this
    // prevents an infinite redirect loop.
    if (role) {
      // Redirect authenticated users away from auth pages and the pre-auth
      // surfaces (splash root + landing) to their role home.
      if (isPublicPath || isPreAuthPath) {
        const url = request.nextUrl.clone()
        url.pathname = getRoleRedirect(role, locale)
        return NextResponse.redirect(url)
      }

      // Enforce role-based access
      const requiredRole = getRequiredRole(pathnameWithoutLocale)
      if (requiredRole && role !== requiredRole) {
        const url = request.nextUrl.clone()
        url.pathname = getRoleRedirect(role, locale)
        return NextResponse.redirect(url)
      }
    }
  }

  // Run intl middleware for locale handling on non-redirected requests
  const intlResponse = intlMiddleware(request)
  if (intlResponse && intlResponse.status !== 200) return intlResponse

  // Propagate next-intl's locale headers (e.g. x-next-intl-locale) so that
  // getRequestConfig receives the correct requestLocale instead of falling back to 'en'
  intlResponse.headers.forEach((value, key) => {
    supabaseResponse.headers.set(key, value)
  })

  return supabaseResponse
}

export const config = {
  matcher: [
    // `api` is excluded so route handlers (e.g. the Chargily payment webhook,
    // /api/push) never hit the auth-redirect logic — an unauthenticated
    // provider POST must reach its handler, not be 307'd to /login.
    '/((?!api|_next/static|_next/image|favicon.ico|sw.js|manifest\\.json|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json)$).*)',
  ],
}
