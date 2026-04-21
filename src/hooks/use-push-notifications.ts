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

function detectIOS(): boolean {
  if (typeof window === 'undefined') return false
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.navigator as any).standalone === true
  )
}

const DISMISSED_KEY = 'push_prompt_dismissed'

export function usePushNotifications() {
  const profile = useAuthStore((s) => s.profile)
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isDismissed, setIsDismissed] = useState(true) // default true avoids flash
  const [isPermissionDenied, setIsPermissionDenied] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [subscribeError, setSubscribeError] = useState<string | null>(null)

  useEffect(() => {
    const ios = detectIOS()
    const standalone = detectStandalone()
    const supported =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window

    setIsIOS(ios)
    setIsStandalone(standalone)
    setIsSupported(supported)
    setIsDismissed(localStorage.getItem(DISMISSED_KEY) === '1')

    if (supported) {
      setIsPermissionDenied(Notification.permission === 'denied')
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
    setSubscribeError(null)
    try {
      const registration = await navigator.serviceWorker.ready
      const permission = await Notification.requestPermission()
      if (permission === 'denied') {
        setIsPermissionDenied(true)
        return
      }
      if (permission !== 'granted') return

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      const supabase = createClient()
      const { error } = await (supabase as any).from('push_subscriptions').upsert(
        {
          user_id: profile.id,
          subscription: subscription.toJSON(),
        },
        { onConflict: 'user_id' }
      )
      if (error) throw error
      setIsSubscribed(true)
    } catch {
      setSubscribeError('Could not enable notifications. Please try again.')
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

  return {
    isSupported,
    isSubscribed,
    isDismissed,
    isPermissionDenied,
    isIOS,
    isStandalone,
    isLoading,
    subscribeError,
    subscribe,
    unsubscribe,
    dismiss,
  }
}
