'use client'

import { Bell, X } from 'lucide-react'
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
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Outfit:wght@300;400;500;600&display=swap');

        @keyframes pp-rise {
          0%   { opacity: 0; transform: translateY(100%) scale(0.96); }
          60%  { opacity: 1; }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pp-fall {
          0%   { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(100%) scale(0.96); }
        }
        @keyframes pp-bell-sway {
          0%, 100% { transform: rotate(0deg); }
          20%       { transform: rotate(14deg); }
          40%       { transform: rotate(-10deg); }
          60%       { transform: rotate(6deg); }
          80%       { transform: rotate(-4deg); }
        }
        @keyframes pp-ring-pulse {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50%       { opacity: 0.7; transform: scale(1.08); }
        }
        @keyframes pp-dot-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(201,168,76,0.6); }
          50%       { transform: scale(1.2); box-shadow: 0 0 0 4px rgba(201,168,76,0); }
        }
        @keyframes pp-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        .pp-wrap {
          position: fixed;
          bottom: 90px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 9999;
          width: calc(100% - 28px);
          max-width: 400px;
          animation: pp-rise 0.55s cubic-bezier(0.34, 1.38, 0.64, 1) forwards;
          font-family: 'Outfit', sans-serif;
        }
        @media (min-width: 768px) {
          .pp-wrap {
            bottom: 32px;
            left: auto;
            right: 24px;
            transform: none;
            width: 360px;
            max-width: 360px;
          }
        }
        @media (min-width: 1024px) {
          .pp-wrap {
            bottom: 40px;
            right: 36px;
            width: 380px;
            max-width: 380px;
          }
        }

        .pp-card {
          position: relative;
          overflow: hidden;
          background: linear-gradient(145deg, #1e3366 0%, #152447 55%, #111d3a 100%);
          border-radius: 20px;
          border: 1px solid rgba(201,168,76,0.22);
          box-shadow:
            0 24px 64px rgba(10,16,34,0.55),
            0 4px 16px rgba(10,16,34,0.35),
            inset 0 1px 0 rgba(201,168,76,0.1);
          padding: 18px 18px 18px 20px;
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }

        /* noise texture overlay */
        .pp-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 20px;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
          opacity: 0.025;
          pointer-events: none;
        }

        /* radial gold glow top-right */
        .pp-card::after {
          content: '';
          position: absolute;
          top: -40px;
          right: -30px;
          width: 160px;
          height: 160px;
          background: radial-gradient(circle, rgba(201,168,76,0.18) 0%, transparent 70%);
          pointer-events: none;
          border-radius: 50%;
        }

        /* gold top rule */
        .pp-top-rule {
          position: absolute;
          top: 0; left: 20px; right: 20px;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(201,168,76,0.55) 40%, rgba(201,168,76,0.55) 60%, transparent);
        }

        .pp-icon-wrap {
          position: relative;
          width: 46px;
          height: 46px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pp-icon-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 1.5px solid rgba(201,168,76,0.45);
          animation: pp-ring-pulse 2.8s ease-in-out infinite;
        }
        .pp-icon-bg {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, rgba(201,168,76,0.28) 0%, rgba(201,168,76,0.1) 100%);
          border: 1px solid rgba(201,168,76,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pp-bell {
          animation: pp-bell-sway 4s ease-in-out 1.2s 1;
          color: #C9A84C;
        }
        .pp-dot {
          position: absolute;
          top: 4px; right: 4px;
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #C9A84C;
          border: 1.5px solid #152447;
          animation: pp-dot-pulse 2s ease-in-out infinite;
        }

        .pp-body {
          flex: 1;
          min-width: 0;
          position: relative;
          z-index: 1;
        }

        .pp-eyebrow {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-bottom: 2px;
        }
        .pp-eyebrow-line {
          width: 18px;
          height: 1px;
          background: rgba(201,168,76,0.5);
        }
        .pp-eyebrow-text {
          font-family: 'Outfit', sans-serif;
          font-size: 9.5px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(201,168,76,0.7);
          margin: 0;
        }

        .pp-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 19px;
          font-weight: 600;
          color: #F5EDD8;
          line-height: 1.2;
          letter-spacing: -0.01em;
          margin: 0 0 5px;
        }

        .pp-subtitle {
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          font-weight: 300;
          color: rgba(235,225,210,0.5);
          line-height: 1.55;
          margin: 0 0 14px;
          letter-spacing: 0.01em;
        }

        .pp-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .pp-enable-btn {
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #d4a84b 0%, #c9973a 50%, #b8892e 100%);
          color: #1B2D5B;
          border: none;
          border-radius: 11px;
          padding: 8px 20px;
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.04em;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s;
          box-shadow: 0 2px 12px rgba(201,168,76,0.35), inset 0 1px 0 rgba(255,255,255,0.2);
        }
        .pp-enable-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.28) 50%, transparent 65%);
          background-size: 200% auto;
          animation: pp-shimmer 2.4s linear infinite;
        }
        .pp-enable-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(201,168,76,0.45), inset 0 1px 0 rgba(255,255,255,0.2);
        }
        .pp-enable-btn:active {
          transform: translateY(0) scale(0.97);
        }
        .pp-enable-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
        }

        .pp-later-btn {
          background: none;
          border: none;
          font-family: 'Outfit', sans-serif;
          font-size: 11.5px;
          font-weight: 400;
          color: rgba(235,225,210,0.38);
          cursor: pointer;
          padding: 4px 2px;
          letter-spacing: 0.02em;
          transition: color 0.15s;
        }
        .pp-later-btn:hover {
          color: rgba(235,225,210,0.62);
        }

        .pp-close-btn {
          position: relative;
          z-index: 1;
          flex-shrink: 0;
          background: rgba(255,255,255,0.055);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 9px;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
          color: rgba(235,225,210,0.35);
        }
        .pp-close-btn:hover {
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,255,255,0.14);
          color: rgba(235,225,210,0.65);
        }
      `}</style>

      {visible && (
        <div className="pp-wrap" role="dialog" aria-label="Enable push notifications">
          <div className="pp-card">
            <div className="pp-top-rule" />

            {/* Icon */}
            <div className="pp-icon-wrap">
              <div className="pp-icon-ring" />
              <div className="pp-icon-bg">
                <Bell size={17} className="pp-bell" />
              </div>
              <span className="pp-dot" />
            </div>

            {/* Content */}
            <div className="pp-body">
              <div className="pp-eyebrow">
                <span className="pp-eyebrow-line" />
                <p className="pp-eyebrow-text">Concierge Alerts</p>
              </div>
              <h2 className="pp-title">Stay in the loop</h2>
              <p className="pp-subtitle">
                Instant updates for your orders,<br />requests &amp; messages.
              </p>
              <div className="pp-actions">
                <button
                  className="pp-enable-btn"
                  onClick={subscribe}
                  disabled={isLoading}
                >
                  {isLoading ? 'Enabling…' : 'Enable'}
                </button>
                <button className="pp-later-btn" onClick={dismiss}>
                  Maybe later
                </button>
              </div>
            </div>

            {/* Close */}
            <button className="pp-close-btn" onClick={dismiss} aria-label="Dismiss">
              <X size={12} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
