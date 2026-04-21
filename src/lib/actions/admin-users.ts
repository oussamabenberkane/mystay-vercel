'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

async function getAdminContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profileData } = await supabase
    .from('profiles')
    .select('role, hotel_id')
    .eq('id', user.id)
    .single()

  const profile = profileData as { role: string; hotel_id: string } | null
  if (!profile || profile.role !== 'admin') return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { supabase: supabase as any, profile, userId: user.id }
}

export async function createUserAction(data: {
  email: string
  password: string
  fullName: string
  phone?: string
  language?: string
  role: 'staff' | 'admin'
  hotelId: string
}) {
  const ctx = await getAdminContext()
  if (!ctx) return { error: 'Unauthorized' }
  if (ctx.profile.hotel_id !== data.hotelId) return { error: 'Unauthorized' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminClient = createAdminClient() as any

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    return { error: authError?.message ?? 'Failed to create user' }
  }

  const { error: profileError } = await adminClient
    .from('profiles')
    .insert({
      id: authData.user.id,
      hotel_id: data.hotelId,
      role: data.role,
      full_name: data.fullName,
      email: data.email,
      phone: data.phone ?? null,
      language: data.language ?? 'en',
    })

  if (profileError) {
    await adminClient.auth.admin.deleteUser(authData.user.id)
    return { error: profileError.message }
  }

  revalidatePath('/', 'layout')
  return { userId: authData.user.id }
}

export async function updateUserRoleAction(
  profileId: string,
  role: 'client' | 'staff' | 'admin'
) {
  const ctx = await getAdminContext()
  if (!ctx) return { error: 'Unauthorized' }

  const { data: targetData } = await ctx.supabase
    .from('profiles')
    .select('hotel_id')
    .eq('id', profileId)
    .single()

  const target = targetData as { hotel_id: string } | null
  if (!target || target.hotel_id !== ctx.profile.hotel_id) return { error: 'Unauthorized' }

  const { error } = await ctx.supabase
    .from('profiles')
    .update({ role } as any)
    .eq('id', profileId)

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return {}
}

export async function deleteUserAction(profileId: string) {
  const ctx = await getAdminContext()
  if (!ctx) return { error: 'Unauthorized' }

  const { data: targetData3 } = await ctx.supabase
    .from('profiles')
    .select('hotel_id')
    .eq('id', profileId)
    .single()

  const target3 = targetData3 as { hotel_id: string } | null
  if (!target3 || target3.hotel_id !== ctx.profile.hotel_id) return { error: 'Unauthorized' }

  const { error: profileError } = await ctx.supabase
    .from('profiles')
    .delete()
    .eq('id', profileId)

  if (profileError) return { error: profileError.message }

  const adminClient = createAdminClient()
  await adminClient.auth.admin.deleteUser(profileId)

  revalidatePath('/', 'layout')
  return {}
}
