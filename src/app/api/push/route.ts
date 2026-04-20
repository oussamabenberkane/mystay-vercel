import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

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

export async function POST(request: Request) {
  if (!vapidConfigured) {
    return NextResponse.json({ error: 'Push notifications not configured' }, { status: 503 })
  }

  try {
    const { userId, title, body, url } = await request.json()

    if (!userId || !title || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    ) as any

    const { data: subs } = await db
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)

    if (!subs?.length) {
      return NextResponse.json({ sent: 0 })
    }

    const payload = JSON.stringify({ title, body, url: url ?? '/' })
    const results = await Promise.allSettled(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      subs.map((s: any) =>
        webpush.sendNotification(s.subscription as webpush.PushSubscription, payload)
      )
    )

    const sent = results.filter((r) => r.status === 'fulfilled').length
    return NextResponse.json({ sent })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
