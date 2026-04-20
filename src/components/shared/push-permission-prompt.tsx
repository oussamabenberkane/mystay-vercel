'use client'

import { Bell, X } from 'lucide-react'
import { usePushNotifications } from '@/hooks/use-push-notifications'

export function PushPermissionPrompt() {
  const { isSupported, isSubscribed, isDismissed, isLoading, subscribe, dismiss } =
    usePushNotifications()

  if (!isSupported || isSubscribed || isDismissed) return null

  return (
    <div
      className="mx-4 mt-3 flex items-start gap-3 rounded-2xl px-4 py-3.5"
      style={{ background: '#FFFFFF', boxShadow: '0 2px 16px rgba(27,45,91,0.08)' }}
    >
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-xl"
        style={{ background: 'rgba(201,168,76,0.12)' }}
      >
        <Bell className="size-[18px]" style={{ color: '#C9A84C' }} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold leading-tight" style={{ color: '#1B2D5B' }}>
          Stay in the loop
        </p>
        <p className="mt-0.5 text-xs leading-relaxed" style={{ color: '#7A8BA8' }}>
          Enable notifications for order updates and messages.
        </p>
        <div className="mt-2.5 flex items-center gap-3">
          <button
            onClick={subscribe}
            disabled={isLoading}
            className="rounded-xl px-4 py-1.5 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
            style={{ background: '#1B2D5B', color: '#F8F0E8' }}
          >
            {isLoading ? 'Enabling…' : 'Enable'}
          </button>
          <button
            onClick={dismiss}
            className="text-xs font-medium"
            style={{ color: '#7A8BA8' }}
          >
            Not now
          </button>
        </div>
      </div>

      <button
        onClick={dismiss}
        className="mt-0.5 shrink-0 rounded-lg p-1 transition-opacity hover:opacity-60"
        aria-label="Dismiss"
      >
        <X className="size-3.5" style={{ color: '#7A8BA8' }} />
      </button>
    </div>
  )
}
