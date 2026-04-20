'use server'

import { createClient } from '@/lib/supabase/server'
import { sendPushToUser, sendPushToHotelStaff } from '@/lib/utils/push'

export type MessageWithSender = {
  id: string
  stay_id: string
  hotel_id: string
  sender_id: string
  content: string
  created_at: string
  sender_name: string
  sender_role: 'client' | 'staff' | 'admin'
}

export type Conversation = {
  stay_id: string
  room_number: string
  guest_name: string
  guest_id: string
  last_message: string
  last_message_at: string
  check_in: string
  check_out: string
}

export async function sendMessageAction(
  content: string,
  stayId: string
): Promise<{ messageId: string | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { messageId: null, error: 'Not authenticated' }

    const trimmed = content.trim()
    if (!trimmed || trimmed.length > 1000) {
      return { messageId: null, error: 'Invalid message content' }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const { data: profile } = await db
      .from('profiles')
      .select('hotel_id, role, full_name')
      .eq('id', user.id)
      .single()

    if (!profile) return { messageId: null, error: 'Profile not found' }

    const { data: stay } = await db
      .from('stays')
      .select('id, hotel_id, guest_id')
      .eq('id', stayId)
      .single()

    if (!stay || stay.hotel_id !== profile.hotel_id) {
      return { messageId: null, error: 'Unauthorized' }
    }

    if (profile.role === 'client' && stay.guest_id !== user.id) {
      return { messageId: null, error: 'Unauthorized' }
    }

    const { data: message, error } = await db
      .from('messages')
      .insert({
        hotel_id: profile.hotel_id,
        stay_id: stayId,
        sender_id: user.id,
        content: trimmed,
      })
      .select('id')
      .single()

    if (error || !message) return { messageId: null, error: 'Failed to send message' }

    const preview = trimmed.length > 60 ? trimmed.slice(0, 60) + '…' : trimmed

    if (profile.role === 'client') {
      sendPushToHotelStaff(profile.hotel_id, {
        title: 'New Guest Message',
        body: preview,
        url: '/staff/chat',
      })
    } else {
      sendPushToUser(stay.guest_id, {
        title: 'Message from Hotel',
        body: `${profile.full_name}: ${preview}`,
        url: '/chat',
      })
    }

    return { messageId: message.id, error: null }
  } catch {
    return { messageId: null, error: 'Unexpected error' }
  }
}

export async function getMessagesForStayAction(
  stayId: string,
  limit = 50
): Promise<{ messages: MessageWithSender[]; error: string | null }> {
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const { data, error } = await db
      .from('messages')
      .select(
        `id, stay_id, hotel_id, sender_id, content, created_at,
         sender:profiles!sender_id(full_name, role)`
      )
      .eq('stay_id', stayId)
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error) return { messages: [], error: error.message }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: MessageWithSender[] = (data ?? []).map((m: any) => ({
      id: m.id,
      stay_id: m.stay_id,
      hotel_id: m.hotel_id,
      sender_id: m.sender_id,
      content: m.content,
      created_at: m.created_at,
      sender_name: m.sender?.full_name ?? 'Hotel Staff',
      sender_role: m.sender?.role ?? 'client',
    }))

    return { messages, error: null }
  } catch {
    return { messages: [], error: 'Unexpected error' }
  }
}

export async function getConversationsForStaffAction(): Promise<{
  conversations: Conversation[]
  error: string | null
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { conversations: [], error: 'Not authenticated' }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const { data: profile } = await db
      .from('profiles')
      .select('hotel_id, role')
      .eq('id', user.id)
      .single()

    if (!profile || !['staff', 'admin'].includes(profile.role)) {
      return { conversations: [], error: 'Unauthorized' }
    }

    const { data, error } = await db
      .from('messages')
      .select(
        `id, stay_id, content, created_at,
         stay:stays(
           id, check_in, check_out, guest_id,
           room:rooms(number),
           guest:profiles!guest_id(full_name)
         )`
      )
      .eq('hotel_id', profile.hotel_id)
      .order('created_at', { ascending: false })
      .limit(300)

    if (error) return { conversations: [], error: error.message }

    const seen = new Set<string>()
    const conversations: Conversation[] = []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const m of data ?? []) {
      if (seen.has(m.stay_id)) continue
      seen.add(m.stay_id)
      conversations.push({
        stay_id: m.stay_id,
        room_number: m.stay?.room?.number ?? '?',
        guest_name: m.stay?.guest?.full_name ?? 'Guest',
        guest_id: m.stay?.guest_id ?? '',
        last_message: m.content,
        last_message_at: m.created_at,
        check_in: m.stay?.check_in ?? '',
        check_out: m.stay?.check_out ?? '',
      })
    }

    return { conversations, error: null }
  } catch {
    return { conversations: [], error: 'Unexpected error' }
  }
}
