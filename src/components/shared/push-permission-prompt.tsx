'use client'

import { Bell, X, Sparkles } from 'lucide-react'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { useEffect, useState } from 'react'

export function PushPermissionPrompt() {
  const { isSupported, isSubscribed, isDismissed, isLoading, subscribe, dismiss } =
    usePushNotifications()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isSupported && !isSubscribed && !isDismissed) {
      const t = setTimeout(() => setVisible(true), 800)
      return () => clearTimeout(t)
    }
  }, [isSupported, isSubscribed, isDismissed])

  if (!isSupported || isSubscribed || isDismissed) return null

  return (
    <>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(120%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes slideDown {
          from { transform: translateY(0);    opacity: 1; }
          to   { transform: translateY(120%); opacity: 0; }
        }
        .push-prompt {
          animation: slideUp 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .push-prompt.hiding {
          animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .push-prompt-btn:hover {
          filter: brightness(1.12);
        }
        .push-prompt-btn:active {
          transform: scale(0.96);
        }
        .push-dismiss-btn:hover {
          opacity: 0.6;
        }
      `}</style>

      {visible && (
        <div
          className="push-prompt"
          style={{
            position: 'fixed',
            bottom: '90px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            width: 'calc(100% - 32px)',
            maxWidth: '400px',
          }}
        >
          <div
            style={{
              background: '#1B2D5B',
              borderRadius: '20px',
              padding: '16px 16px 16px 18px',
              boxShadow: '0 8px 40px rgba(27,45,91,0.28), 0 2px 8px rgba(27,45,91,0.14)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px',
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '14px',
                background: 'rgba(201,168,76,0.18)',
                border: '1px solid rgba(201,168,76,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Bell size={18} style={{ color: '#C9A84C' }} />
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#F8F0E8',
                    lineHeight: 1.3,
                    letterSpacing: '-0.01em',
                  }}
                >
                  Stay in the loop
                </p>
                <Sparkles size={11} style={{ color: '#C9A84C', flexShrink: 0 }} />
              </div>
              <p
                style={{
                  margin: '0 0 12px',
                  fontSize: '11.5px',
                  color: 'rgba(248,240,232,0.55)',
                  lineHeight: 1.5,
                }}
              >
                Get real-time updates for orders and messages.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={subscribe}
                  disabled={isLoading}
                  className="push-prompt-btn"
                  style={{
                    background: '#C9A84C',
                    color: '#1B2D5B',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '8px 18px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    opacity: isLoading ? 0.6 : 1,
                    transition: 'filter 0.15s, transform 0.1s',
                    letterSpacing: '0.01em',
                  }}
                >
                  {isLoading ? 'Enabling…' : 'Enable'}
                </button>
                <button
                  onClick={dismiss}
                  className="push-dismiss-btn"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(248,240,232,0.45)',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    padding: '4px 2px',
                    transition: 'opacity 0.15s',
                  }}
                >
                  Not now
                </button>
              </div>
            </div>

            {/* Close */}
            <button
              onClick={dismiss}
              className="push-dismiss-btn"
              aria-label="Dismiss"
              style={{
                background: 'rgba(248,240,232,0.08)',
                border: 'none',
                borderRadius: '10px',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'opacity 0.15s',
              }}
            >
              <X size={13} style={{ color: 'rgba(248,240,232,0.5)' }} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
