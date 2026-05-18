'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type Announcement = {
  id: string
  hotel_id: string
  title: string
  body: string
  category: string
  event_date: string | null
  is_active: boolean
  created_at: string
}

async function getAdminCtx() {
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
  return { supabase: supabase as any, hotelId: profile.hotel_id }
}

export async function getAnnouncementsAction(): Promise<{ announcements: Announcement[]; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { announcements: [] }

  const { data: profileData } = await supabase
    .from('profiles')
    .select('hotel_id')
    .eq('id', user.id)
    .single()

  const profile = profileData as { hotel_id: string } | null
  if (!profile) return { announcements: [] }

  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('hotel_id', profile.hotel_id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) return { announcements: [], error: error.message }
  return { announcements: (data ?? []) as Announcement[] }
}

export async function getAnnouncementsAdminAction(): Promise<{ announcements: Announcement[]; error?: string }> {
  const ctx = await getAdminCtx()
  if (!ctx) return { announcements: [], error: 'Unauthorized' }

  const { data, error } = await ctx.supabase
    .from('announcements')
    .select('*')
    .eq('hotel_id', ctx.hotelId)
    .order('created_at', { ascending: false })

  if (error) return { announcements: [], error: error.message }
  return { announcements: (data ?? []) as Announcement[] }
}

export async function createAnnouncementAction(data: {
  title: string
  body: string
  category: string
  event_date?: string | null
}): Promise<{ announcement?: Announcement; error?: string }> {
  const ctx = await getAdminCtx()
  if (!ctx) return { error: 'Unauthorized' }

  const { data: row, error } = await ctx.supabase
    .from('announcements')
    .insert({
      hotel_id: ctx.hotelId,
      title: data.title,
      body: data.body,
      category: data.category,
      event_date: data.event_date ?? null,
    } as any)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return { announcement: row as Announcement }
}

export async function deleteAnnouncementAction(id: string): Promise<{ error?: string }> {
  const ctx = await getAdminCtx()
  if (!ctx) return { error: 'Unauthorized' }

  const { error } = await ctx.supabase
    .from('announcements')
    .delete()
    .eq('id', id)
    .eq('hotel_id', ctx.hotelId)

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return {}
}

export async function toggleAnnouncementAction(id: string, is_active: boolean): Promise<{ error?: string }> {
  const ctx = await getAdminCtx()
  if (!ctx) return { error: 'Unauthorized' }

  const { error } = await ctx.supabase
    .from('announcements')
    .update({ is_active } as any)
    .eq('id', id)
    .eq('hotel_id', ctx.hotelId)

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return {}
}
