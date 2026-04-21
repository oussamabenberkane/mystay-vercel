'use client'

type Props = {
  content: string
  senderName: string
  senderRole: 'client' | 'staff' | 'admin'
  createdAt: string
  isOwn: boolean
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  if (isToday) return time
  if (isYesterday) return `Yesterday ${time}`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ` ${time}`
}

export function MessageBubble({ content, senderName, createdAt, isOwn }: Props) {
  return (
    <div className={`msg-rise flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[78%] flex-col gap-1 ${isOwn ? 'items-end' : 'items-start'}`}>
        {!isOwn && (
          <div className="flex items-center gap-1.5 px-1">
            <span
              className="text-[10px] font-semibold uppercase tracking-widest font-heading"
              style={{ color: '#C9A84C' }}
            >
              {senderName}
            </span>
          </div>
        )}

        <div
          className="px-4 py-3 text-sm leading-relaxed"
          style={
            isOwn
              ? {
                  background: '#1B2D5B',
                  color: '#F8F0E8',
                  borderRadius: '1.25rem 1.25rem 0.3rem 1.25rem',
                  boxShadow: '0 2px 12px rgba(27,45,91,0.2)',
                }
              : {
                  background: '#FFFFFF',
                  color: '#1B2D5B',
                  borderRadius: '1.25rem 1.25rem 1.25rem 0.3rem',
                  boxShadow: '0 1px 8px rgba(27,45,91,0.07)',
                  borderLeft: '2px solid rgba(201,168,76,0.35)',
                }
          }
        >
          {content}
        </div>

        <span
          className="px-1 text-[10px] tabular-nums"
          style={{ color: '#9BACC0' }}
        >
          {formatTime(createdAt)}
        </span>
      </div>
    </div>
  )
}
