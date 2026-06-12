'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { defaultLocale } from '@/lib/i18n/config'

type Role = 'client' | 'staff' | 'admin'

function getRoleRedirect(role: Role | null, locale: string): string {
  if (role === 'staff') return `/${locale}/staff/orders`
  if (role === 'admin') return `/${locale}/admin/operations`
  return `/${locale}/dashboard`
}

const authErrorMap: Record<string, string> = {
  'Invalid login credentials': 'Incorrect email or password',
  'User already registered': 'An account with this email already exists',
  'Email not confirmed': 'Please verify your email before logging in',
}

function mapAuthError(message: string): string {
  return authErrorMap[message] ?? message
}

export async function loginAction(formData: { email: string; password: string; locale?: string }) {
  const supabase = await createClient()
  const locale = formData.locale ?? defaultLocale

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.email,
    password: formData.password,
  })

  if (error) {
    return { error: mapAuthError(error.message) }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Authentication failed' }

  const { data: profileData } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const profile = profileData as { role: Role } | null

  // Redirect server-side (not via client router.push) so the auth cookie set by
  // signInWithPassword and the navigation ship in the SAME response. This avoids a
  // cookie-propagation race where the destination's server-side getUser() guard runs
  // before the cookie is committed and bounces the user back to /login — the cause of
  // logins intermittently failing, especially on mobile Safari.
  revalidatePath('/', 'layout')
  redirect(getRoleRedirect(profile?.role ?? null, locale))
}

export async function signupAction(formData: {
  email: string
  password: string
  fullName: string
  phone?: string
  language: 'en' | 'fr' | 'ar'
  hotelSlug: string
}) {
  const supabase = await createClient()

  const { data: hotelData, error: hotelError } = await supabase
    .from('hotels')
    .select('id')
    .eq('slug', formData.hotelSlug)
    .single()

  const hotel = hotelData as { id: string } | null
  if (hotelError || !hotel) {
    return { error: 'Hotel not found. Please check your hotel code.' }
  }

  const { data: authData, error: signupError } = await supabase.auth.signUp({
    email: formData.email,
    password: formData.password,
  })

  if (signupError) {
    return { error: mapAuthError(signupError.message) }
  }

  const userId = authData.user?.id
  if (!userId) {
    return { error: 'Signup failed. Please try again.' }
  }

  const { error: profileError } = await supabase.from('profiles').insert({
    id: userId,
    hotel_id: hotel.id,
    role: 'client' as const,
    full_name: formData.fullName,
    email: formData.email,
    phone: formData.phone ?? null,
    language: formData.language,
  } as any)

  if (profileError) {
    return { error: 'Failed to create profile. Please contact support.' }
  }

  return { error: null }
}

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect(`/${defaultLocale}/login`)
}

export async function resetPasswordAction(formData: { email: string }) {
  const supabase = await createClient()

  const headersList = await headers()
  const origin = headersList.get('origin') ?? `http://localhost:3000`

  const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
    redirectTo: `${origin}/${defaultLocale}/reset-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return { error: null }
}

export async function updatePasswordAction(formData: { password: string }) {
  const supabase = await createClient()

  const { error } = await supabase.auth.updateUser({
    password: formData.password,
  })

  if (error) {
    return { error: error.message }
  }

  return { error: null }
}
