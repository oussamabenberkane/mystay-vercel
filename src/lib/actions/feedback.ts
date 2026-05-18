'use server'

import { createClient } from '@/lib/supabase/server'
import { getActiveStayAction } from './room-service'

export async function submitFeedbackAction(data: {
  rating: number
  remarks: string
  complaints: string
  impressions: string
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data: profileData } = await supabase
    .from('profiles')
    .select('hotel_id')
    .eq('id', user.id)
    .single()
  const profile = profileData as { hotel_id: string } | null
  if (!profile) return { error: 'Profil introuvable' }

  const { stay } = await getActiveStayAction()
  if (!stay) return { error: 'Aucun séjour actif' }

  const { error } = await (supabase as any).from('feedback').insert({
    hotel_id:    profile.hotel_id,
    stay_id:     stay.id,
    guest_id:    user.id,
    rating:      data.rating,
    remarks:     data.remarks || null,
    complaints:  data.complaints || null,
    impressions: data.impressions || null,
  })

  if (error) return { error: error.message }
  return { success: true }
}

export async function getMyFeedbackAction() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { feedback: null }

  const { stay } = await getActiveStayAction()
  if (!stay) return { feedback: null }

  const { data } = await (supabase as any)
    .from('feedback')
    .select('*')
    .eq('stay_id', stay.id)
    .eq('guest_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return { feedback: data ?? null }
}
