'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type RestaurantHour = { name: string; hours: string }

export type HotelInfoData = {
  tagline?: string | null
  phone?: string | null
  email?: string | null
  checkin_time?: string | null
  checkout_time?: string | null
  wifi_network?: string | null
  wifi_password?: string | null
  room_amenities?: string[] | null
  hotel_services?: string[] | null
  restaurant_hours?: RestaurantHour[] | null
}

export type HotelInfoRow = HotelInfoData & {
  id: string
  hotel_id: string
  updated_at: string
}

async function getHotelId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profileData } = await supabase
    .from('profiles')
    .select('hotel_id')
    .eq('id', user.id)
    .single()

  const profile = profileData as { hotel_id: string } | null
  return profile ? { supabase, hotelId: profile.hotel_id } : null
}

export async function getHotelInfoAction(): Promise<HotelInfoRow | null> {
  const ctx = await getHotelId()
  if (!ctx) return null

  const { data } = await ctx.supabase
    .from('hotel_info')
    .select('*')
    .eq('hotel_id', ctx.hotelId)
    .single()

  return (data as HotelInfoRow | null) ?? null
}

export async function upsertHotelInfoAction(input: HotelInfoData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profileData } = await supabase
    .from('profiles')
    .select('role, hotel_id')
    .eq('id', user.id)
    .single()

  const profile = profileData as { role: string; hotel_id: string } | null
  if (!profile || profile.role !== 'admin') return { error: 'Unauthorized' }

  const { error } = await (supabase as any)
    .from('hotel_info')
    .upsert(
      { ...input, hotel_id: profile.hotel_id, updated_at: new Date().toISOString() } as any,
      { onConflict: 'hotel_id' }
    )

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  return {}
}
