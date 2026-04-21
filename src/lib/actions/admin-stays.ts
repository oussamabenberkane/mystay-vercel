'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type AdminProfile = { role: string; hotel_id: string }

async function getAdminContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profileData } = await supabase
    .from('profiles')
    .select('role, hotel_id')
    .eq('id', user.id)
    .single()

  const profile = profileData as AdminProfile | null
  if (!profile || profile.role !== 'admin') return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { supabase: supabase as any, profile }
}

export async function createStayAction(data: {
  guestId: string
  roomId: string
  checkIn: string
  checkOut: string
}) {
  const ctx = await getAdminContext()
  if (!ctx) return { error: 'Unauthorized' }

  const { data: existing } = await ctx.supabase
    .from('stays')
    .select('id')
    .eq('room_id', data.roomId)
    .eq('status', 'active')
    .maybeSingle()

  if (existing) return { error: 'Room already has an active stay' }

  const { data: stay, error } = await ctx.supabase
    .from('stays')
    .insert({
      hotel_id: ctx.profile.hotel_id,
      guest_id: data.guestId,
      room_id: data.roomId,
      check_in: data.checkIn,
      check_out: data.checkOut,
      status: 'active' as const,
    } as any)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return { stayId: (stay as any).id }
}

export async function archiveStayAction(stayId: string) {
  const ctx = await getAdminContext()
  if (!ctx) return { error: 'Unauthorized' }

  const { data: stayData } = await ctx.supabase
    .from('stays')
    .select('hotel_id')
    .eq('id', stayId)
    .single()

  const stay = stayData as { hotel_id: string } | null
  if (!stay || stay.hotel_id !== ctx.profile.hotel_id) return { error: 'Unauthorized' }

  const { error } = await ctx.supabase
    .from('stays')
    .update({ status: 'archived' } as any)
    .eq('id', stayId)

  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return {}
}
