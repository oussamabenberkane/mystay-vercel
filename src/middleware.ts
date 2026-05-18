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

type Role = 'client' | 'staff' | 'admin'

function getRoleRedirect(role: Role, locale: string): string {
  if (role === 'staff') return `/${locale}/staff/orders`
  if (role === 'admin') return `/${locale}/admin/operations`
  return `/${locale}/dashboard`
}

function getRequiredRole(path: string): Role | null {
  if (path.startsWith('/staff/')) return 'staff'
  if (path.startsWith('/admin/')) return 'admin'
  if (path.startsWith('/dashboard') || path.startsWith('/menu') || path.startsWith('/orders') || path.startsWith('/requests') || path.startsWith('/chat') || path.startsWith('/expenses') || path.startsWith('/feedback')) return 'client'
  return null
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const firstSegment = pathname.split('/')[1] || ''
  const locale = (locales as readonly string[]).includes(firstSegment) ? firstSegment : defaultLocale

  // Strip locale prefix for path matching
  const pathnameWithoutLocale = pathname.replace(/^\/(en|fr|ar)/, '') || '/'

  // Skip auth logic for server action calls — they POST to the page path and must not be redirected
  const isServerAction = request.method === 'POST' && request.headers.has('next-action')
  if (isServerAction) return intlMiddleware(request)

  const { supabaseResponse, user, supabase } = await updateSession(request)

  const isPublicPath = publicPaths.some(p => pathnameWithoutLocale.startsWith(p))

  // Redirect unauthenticated users to login
  if (!user && !isPublicPath && pathnameWithoutLocale !== '/') {
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
      // Redirect authenticated users away from auth pages and root
      if (isPublicPath || pathnameWithoutLocale === '/') {
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
    '/((?!_next/static|_next/image|favicon.ico|sw.js|manifest\\.json|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json)$).*)',
  ],
}
