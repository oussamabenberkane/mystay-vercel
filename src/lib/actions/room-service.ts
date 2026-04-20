'use server'

import { createClient } from '@/lib/supabase/server'
import { sendPushToUser } from '@/lib/utils/push'

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'delivering'
  | 'delivered'
  | 'cancelled'

export type PlaceOrderItem = {
  menuItemId: string
  quantity: number
  unitPrice: number
}

export async function placeOrderAction(
  items: PlaceOrderItem[],
  notes: string,
  stayId: string
): Promise<{ orderId: string | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { orderId: null, error: 'Not authenticated' }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const { data: stay } = await db
      .from('stays')
      .select('id, hotel_id, status')
      .eq('id', stayId)
      .eq('guest_id', user.id)
      .eq('status', 'active')
      .single()

    if (!stay) return { orderId: null, error: 'No active stay found' }

    const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

    const { data: order, error: orderError } = await db
      .from('orders')
      .insert({
        hotel_id: stay.hotel_id,
        stay_id: stayId,
        guest_id: user.id,
        status: 'pending',
        total_amount: totalAmount,
        notes: notes || null,
      })
      .select('id')
      .single()

    if (orderError || !order) return { orderId: null, error: 'Failed to place order' }

    const orderItems = items.map((item) => ({
      order_id: order.id,
      menu_item_id: item.menuItemId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
    }))

    const { error: itemsError } = await db.from('order_items').insert(orderItems)
    if (itemsError) return { orderId: null, error: 'Failed to save order items' }

    return { orderId: order.id, error: null }
  } catch {
    return { orderId: null, error: 'Unexpected error' }
  }
}

export async function updateOrderStatusAction(
  orderId: string,
  status: OrderStatus
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

    const { data: order, error } = await db
      .from('orders')
      .update({ status })
      .eq('id', orderId)
      .eq('hotel_id', profile.hotel_id)
      .select('guest_id')
      .single()

    if (!error && order?.guest_id) {
      const pushMap: Partial<Record<OrderStatus, { title: string; body: string }>> = {
        confirmed:  { title: 'Order Confirmed ✓',  body: 'Your room service order is being prepared' },
        delivering: { title: 'On the Way! 🚀',      body: 'Your order is on its way to your room' },
        delivered:  { title: 'Order Delivered ✓',   body: 'Enjoy your meal! Your order has arrived' },
      }
      const notif = pushMap[status]
      if (notif) {
        sendPushToUser(order.guest_id, { ...notif, url: '/orders' })
      }
    }

    return { error: error?.message ?? null }
  } catch {
    return { error: 'Unexpected error' }
  }
}

export async function getOrdersForStayAction(stayId: string) {
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const { data, error } = await db
      .from('orders')
      .select('*, order_items(*, menu_items(name))')
      .eq('stay_id', stayId)
      .order('created_at', { ascending: false })

    if (error) return { orders: [], error: error.message }
    return { orders: data ?? [], error: null }
  } catch {
    return { orders: [], error: 'Unexpected error' }
  }
}

export async function getActiveStayAction(): Promise<{
  stay: { id: string; hotel_id: string; room_number: string; room_type: string } | null
  error: string | null
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { stay: null, error: 'Not authenticated' }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const { data, error } = await db.rpc('get_active_stay', { p_guest_id: user.id })

    if (error) return { stay: null, error: error.message }
    const row = data?.[0] ?? null
    if (!row) return { stay: null, error: null }
    return {
      stay: {
        id: row.id,
        hotel_id: row.hotel_id,
        room_number: row.room_number,
        room_type: row.room_type,
      },
      error: null,
    }
  } catch {
    return { stay: null, error: 'Unexpected error' }
  }
}

export async function getStaffOrdersAction(): Promise<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  orders: any[]
  error: string | null
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { orders: [], error: 'Not authenticated' }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const { data: profile } = await db
      .from('profiles')
      .select('hotel_id, role')
      .eq('id', user.id)
      .single()

    if (!profile || !['staff', 'admin'].includes(profile.role)) {
      return { orders: [], error: 'Unauthorized' }
    }

    const { data, error } = await db
      .from('orders')
      .select(`
        *,
        order_items(*, menu_items(name)),
        stays(*, rooms(number, type)),
        profiles(full_name)
      `)
      .eq('hotel_id', profile.hotel_id)
      .order('created_at', { ascending: false })

    if (error) return { orders: [], error: error.message }
    return { orders: data ?? [], error: null }
  } catch {
    return { orders: [], error: 'Unexpected error' }
  }
}
