import webpush from 'web-push'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const vapidConfigured =
  !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
  !!process.env.VAPID_PRIVATE_KEY &&
  !!process.env.VAPID_SUBJECT &&
  !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY.startsWith('your_')

if (vapidConfigured) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )
}

function getServiceDb() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  ) as any
}

// 410 Gone / 404 Not Found = subscription expired or unregistered on the browser side
function isStaleSubscription(err: unknown): boolean {
  return (err as { statusCode?: number })?.statusCode === 410 ||
    (err as { statusCode?: number })?.statusCode === 404
}

export async function sendPushToUser(
  userId: string,
  notification: { title: string; body: string; url?: string }
): Promise<void> {
  if (!vapidConfigured) return
  try {
    const db = getServiceDb()
    const { data: subs } = await db
      .from('push_subscriptions')
      .select('user_id, subscription')
      .eq('user_id', userId)

    if (!subs?.length) return

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      url: notification.url ?? '/',
    })

    await Promise.allSettled(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      subs.map((s: any) =>
        webpush.sendNotification(s.subscription as webpush.PushSubscription, payload).catch(
          async (err) => {
            if (isStaleSubscription(err)) {
              await db.from('push_subscriptions').delete().eq('user_id', s.user_id)
            }
          }
        )
      )
    )
  } catch {
    // Never throw from push utility
  }
}

export async function sendPushToHotelStaff(
  hotelId: string,
  notification: { title: string; body: string; url?: string }
): Promise<void> {
  if (!vapidConfigured) return
  try {
    const db = getServiceDb()

    const { data: staffProfiles } = await db
      .from('profiles')
      .select('id')
      .eq('hotel_id', hotelId)
      .in('role', ['staff', 'admin'])

    if (!staffProfiles?.length) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const staffIds = staffProfiles.map((p: any) => p.id)

    const { data: subs } = await db
      .from('push_subscriptions')
      .select('user_id, subscription')
      .in('user_id', staffIds)

    if (!subs?.length) return

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      url: notification.url ?? '/',
    })

    await Promise.allSettled(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      subs.map((s: any) =>
        webpush.sendNotification(s.subscription as webpush.PushSubscription, payload).catch(
          async (err) => {
            if (isStaleSubscription(err)) {
              await db.from('push_subscriptions').delete().eq('user_id', s.user_id)
            }
          }
        )
      )
    )
  } catch {
    // Never throw from push utility
  }
}
