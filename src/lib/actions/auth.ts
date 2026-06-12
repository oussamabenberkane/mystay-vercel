'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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
  'A user with this email address has already been registered': 'An account with this email already exists',
  'Email not confirmed': 'Please verify your email before logging in',
  'email rate limit exceeded': 'Too many emails sent — please try again later',
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

const serviceRoleConfigured = () =>
  !!process.env.SUPABASE_SERVICE_ROLE_KEY &&
  !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('placeholder')

export async function signupAction(formData: {
  email: string
  password: string
  fullName: string
  phone?: string
  language: 'en' | 'fr' | 'ar'
  hotelSlug: string
  locale?: string
}): Promise<{ error: string | null; needsEmailConfirmation?: boolean }> {
  const supabase = await createClient()
  const locale = formData.locale ?? defaultLocale

  // hotels RLS only allows authenticated users to read their own hotel, and
  // the signup user doesn't exist yet — resolve the slug via the SECURITY
  // DEFINER helper instead of a direct select.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: hotelIdData, error: hotelError } = await (supabase as any)
    .rpc('get_hotel_id_by_slug', { hotel_slug: formData.hotelSlug })

  const hotelId = hotelIdData as string | null
  if (hotelError || !hotelId) {
    return { error: 'Hotel not found. Please check your hotel code.' }
  }

  let userId: string

  if (serviceRoleConfigured()) {
    // Create the account pre-confirmed via the service-role client: no
    // confirmation email is sent (Supabase's built-in SMTP is rate-limited to a
    // few emails per hour), and the guest can be signed in immediately.
    const admin = createAdminClient()
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: formData.email,
      password: formData.password,
      email_confirm: true,
    })

    if (createError || !created.user) {
      return { error: mapAuthError(createError?.message ?? 'Signup failed. Please try again.') }
    }
    userId = created.user.id
  } else {
    // Fallback without a service-role key: regular signUp, which sends a
    // confirmation email if the project has email confirmation enabled.
    const { data: authData, error: signupError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    })

    if (signupError) {
      return { error: mapAuthError(signupError.message) }
    }
    if (!authData.user?.id) {
      return { error: 'Signup failed. Please try again.' }
    }
    // For an already-registered email, signUp "succeeds" with an obfuscated
    // user that has no identities (anti-enumeration) — detect it here instead
    // of failing later in profile creation.
    if (!authData.user.identities?.length) {
      return { error: 'An account with this email already exists' }
    }
    userId = authData.user.id

    // The signup RPC below works as anon, but without a session the user can't
    // log in until they confirm their email — tell the page to say so.
    if (!authData.session) {
      const profileResult = await createSignupProfile(supabase, userId, formData)
      if (profileResult.error) return profileResult
      return { error: null, needsEmailConfirmation: true }
    }
  }

  const profileResult = await createSignupProfile(supabase, userId, formData)
  if (profileResult.error) {
    if (serviceRoleConfigured()) {
      await createAdminClient().auth.admin.deleteUser(userId)
    }
    return profileResult
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: formData.email,
    password: formData.password,
  })

  if (signInError) {
    return { error: mapAuthError(signInError.message) }
  }

  // Same as loginAction: redirect server-side so the auth cookie and the
  // navigation ship in the same response (avoids the cookie-propagation race).
  revalidatePath('/', 'layout')
  redirect(getRoleRedirect('client', locale))
}

async function createSignupProfile(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  formData: { hotelSlug: string; fullName: string; phone?: string; language: string }
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('create_signup_profile', {
    p_user_id: userId,
    p_hotel_slug: formData.hotelSlug,
    p_full_name: formData.fullName,
    p_phone: formData.phone ?? null,
    p_language: formData.language,
  })
  return { error: error ? 'Failed to create profile. Please contact support.' : null }
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
