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
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`flex max-w-[78%] flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}
      >
        {!isOwn && (
          <span
            className="px-1 text-[11px] font-semibold"
            style={{ color: '#C9A84C' }}
          >
            {senderName}
          </span>
        )}
        <div
          className="px-4 py-2.5 text-sm leading-relaxed"
          style={
            isOwn
              ? {
                  background: '#1B2D5B',
                  color: '#F8F0E8',
                  borderRadius: '1.125rem 1.125rem 0.25rem 1.125rem',
                }
              : {
                  background: '#FFFFFF',
                  color: '#1B2D5B',
                  borderRadius: '1.125rem 1.125rem 1.125rem 0.25rem',
                  boxShadow: '0 1px 6px rgba(27,45,91,0.07)',
                }
          }
        >
          {content}
        </div>
        <span className="px-1 text-[10px]" style={{ color: '#7A8BA8' }}>
          {formatTime(createdAt)}
        </span>
      </div>
    </div>
  )
}
