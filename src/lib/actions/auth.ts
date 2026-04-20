'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { defaultLocale } from '@/lib/i18n/config'

function getLocaleFromHeaders(): string {
  return defaultLocale
}

const authErrorMap: Record<string, string> = {
  'Invalid login credentials': 'Incorrect email or password',
  'User already registered': 'An account with this email already exists',
  'Email not confirmed': 'Please verify your email before logging in',
}

function mapAuthError(message: string): string {
  return authErrorMap[message] ?? message
}

export async function loginAction(formData: { email: string; password: string }) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.email,
    password: formData.password,
  })

  if (error) {
    return { role: null, error: mapAuthError(error.message) }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { role: null, error: 'Authentication failed' }

  const { data: profileData } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const profile = profileData as { role: 'client' | 'staff' | 'admin' } | null
  return { role: profile?.role ?? null, error: null }
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
