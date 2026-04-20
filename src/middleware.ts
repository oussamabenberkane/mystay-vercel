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
  if (path.startsWith('/dashboard') || path.startsWith('/menu') || path.startsWith('/orders') || path.startsWith('/requests') || path.startsWith('/chat') || path.startsWith('/expenses')) return 'client'
  return null
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const locale = pathname.split('/')[1] || defaultLocale

  // Strip locale prefix for path matching
  const pathnameWithoutLocale = pathname.replace(/^\/(en|fr|ar)/, '') || '/'

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

    // Redirect authenticated users away from auth pages and root
    if (isPublicPath || pathnameWithoutLocale === '/') {
      const url = request.nextUrl.clone()
      url.pathname = role ? getRoleRedirect(role, locale) : `/${locale}/dashboard`
      return NextResponse.redirect(url)
    }

    // Enforce role-based access
    if (role) {
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

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
