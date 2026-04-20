'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/store/auth-store'

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const buf = new ArrayBuffer(rawData.length)
  const outputArray = new Uint8Array(buf)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

const DISMISSED_KEY = 'push_prompt_dismissed'

export function usePushNotifications() {
  const profile = useAuthStore((s) => s.profile)
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isDismissed, setIsDismissed] = useState(true) // default true avoids flash
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window

    setIsSupported(supported)
    setIsDismissed(localStorage.getItem(DISMISSED_KEY) === '1')

    if (supported) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub)
        })
      })
    }
  }, [])

  const subscribe = useCallback(async () => {
    if (!isSupported || !profile) return
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidKey || vapidKey.startsWith('your_')) return

    setIsLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('push_subscriptions').upsert(
        {
          user_id: profile.id,
          subscription: subscription.toJSON(),
        },
        { onConflict: 'user_id' }
      )
      setIsSubscribed(true)
    } catch {
      // Gracefully handle
    } finally {
      setIsLoading(false)
    }
  }, [isSupported, profile])

  const unsubscribe = useCallback(async () => {
    if (!profile) return
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await subscription.unsubscribe()
        const supabase = createClient()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('push_subscriptions').delete().eq('user_id', profile.id)
      }
      setIsSubscribed(false)
    } catch {
      // Gracefully handle
    }
  }, [profile])

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, '1')
    setIsDismissed(true)
  }, [])

  return { isSupported, isSubscribed, isDismissed, isLoading, subscribe, unsubscribe, dismiss }
}
