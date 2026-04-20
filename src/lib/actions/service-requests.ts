'use server'

import { createClient } from '@/lib/supabase/server'
import { sendPushToUser, sendPushToHotelStaff } from '@/lib/utils/push'

export type RequestType = 'cleaning' | 'towels' | 'maintenance' | 'other'
export type RequestPriority = 'normal' | 'urgent'
export type RequestStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

export async function createServiceRequestAction(data: {
  type: RequestType
  description?: string
  priority: RequestPriority
  stayId: string
}): Promise<{ requestId: string | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { requestId: null, error: 'Not authenticated' }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const { data: stay } = await db
      .from('stays')
      .select('id, hotel_id, status')
      .eq('id', data.stayId)
      .eq('guest_id', user.id)
      .eq('status', 'active')
      .single()

    if (!stay) return { requestId: null, error: 'No active stay found' }

    const { data: request, error } = await db
      .from('service_requests')
      .insert({
        hotel_id: stay.hotel_id,
        stay_id: data.stayId,
        guest_id: user.id,
        type: data.type,
        description: data.description || null,
        priority: data.priority,
        status: 'pending',
      })
      .select('id')
      .single()

    if (error || !request) return { requestId: null, error: 'Failed to submit request' }

    if (data.priority === 'urgent') {
      // Look up room number for the notification body
      const { data: stayRow } = await db
        .from('stays')
        .select('rooms(number)')
        .eq('id', data.stayId)
        .single()
      const roomNumber = stayRow?.rooms?.number ?? '?'
      const typeLabel = data.type.charAt(0).toUpperCase() + data.type.slice(1)
      sendPushToHotelStaff(stay.hotel_id, {
        title: '⚠️ Urgent Request',
        body: `Room ${roomNumber} needs ${typeLabel}`,
        url: '/staff/requests',
      })
    }

    return { requestId: request.id, error: null }
  } catch {
    return { requestId: null, error: 'Unexpected error' }
  }
}

export async function updateServiceRequestStatusAction(
  requestId: string,
  status: 'in_progress' | 'completed' | 'cancelled'
): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const { data: profile } = await db
      .from('profiles')
      .select('role, hotel_id')
      .eq('id', user.id)
      .single()

    if (!profile || !['staff', 'admin'].includes(profile.role)) {
      return { error: 'Unauthorized' }
    }

    const { data: reqRow, error } = await db
      .from('service_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', requestId)
      .eq('hotel_id', profile.hotel_id)
      .select('guest_id, type')
      .single()

    if (!error && reqRow?.guest_id && status === 'in_progress') {
      const typeLabel = reqRow.type.charAt(0).toUpperCase() + reqRow.type.slice(1)
      sendPushToUser(reqRow.guest_id, {
        title: 'Request Accepted',
        body: `Your ${typeLabel} request is being handled`,
        url: '/requests',
      })
    }

    return { error: error?.message ?? null }
  } catch {
    return { error: 'Unexpected error' }
  }
}

export async function getServiceRequestsForStayAction(stayId: string): Promise<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requests: any[]
  error: string | null
}> {
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const { data, error } = await db
      .from('service_requests')
      .select('*')
      .eq('stay_id', stayId)
      .order('created_at', { ascending: false })

    if (error) return { requests: [], error: error.message }
    return { requests: data ?? [], error: null }
  } catch {
    return { requests: [], error: 'Unexpected error' }
  }
}

export async function getStaffServiceRequestsAction(): Promise<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requests: any[]
  error: string | null
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { requests: [], error: 'Not authenticated' }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const { data: profile } = await db
      .from('profiles')
      .select('hotel_id, role')
      .eq('id', user.id)
      .single()

    if (!profile || !['staff', 'admin'].includes(profile.role)) {
      return { requests: [], error: 'Unauthorized' }
    }

    const { data, error } = await db
      .from('service_requests')
      .select(`
        *,
        stays(*, rooms(number, type)),
        profiles!guest_id(full_name)
      `)
      .eq('hotel_id', profile.hotel_id)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) return { requests: [], error: error.message }
    return { requests: data ?? [], error: null }
  } catch {
    return { requests: [], error: 'Unexpected error' }
  }
}
