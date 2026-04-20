'use client'

import type { Conversation } from '@/lib/actions/chat'

type Props = {
  conversations: Conversation[]
  activeStayId: string | null
  onSelect: (conv: Conversation) => void
  unreadStayIds?: Set<string>
}

function relativeTime(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

export function ConversationList({ conversations, activeStayId, onSelect, unreadStayIds }: Props) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <div
          className="mb-4 flex size-14 items-center justify-center rounded-2xl text-2xl"
          style={{ background: 'rgba(27,45,91,0.06)' }}
        >
          💬
        </div>
        <p className="text-sm font-medium" style={{ color: '#1B2D5B' }}>
          No conversations yet
        </p>
        <p className="mt-1 text-xs" style={{ color: '#7A8BA8' }}>
          Guest messages will appear here
        </p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col py-1">
      {conversations.map((conv) => {
        const isActive = conv.stay_id === activeStayId
        const isUnread = unreadStayIds?.has(conv.stay_id)

        return (
          <li key={conv.stay_id}>
            <button
              onClick={() => onSelect(conv)}
              className="w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors"
              style={
                isActive
                  ? {
                      background: 'rgba(201,168,76,0.08)',
                      borderLeft: '3px solid #C9A84C',
                    }
                  : {
                      borderLeft: '3px solid transparent',
                    }
              }
            >
              {/* Room badge */}
              <div
                className="flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                style={{
                  background: isActive ? '#C9A84C' : '#EEE4D8',
                  color: isActive ? '#FFFFFF' : '#7A8BA8',
                }}
              >
                {conv.room_number}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p
                    className="truncate text-sm font-semibold"
                    style={{ color: '#1B2D5B' }}
                  >
                    {conv.guest_name}
                  </p>
                  <span className="shrink-0 text-[10px]" style={{ color: '#7A8BA8' }}>
                    {relativeTime(conv.last_message_at)}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  {isUnread && (
                    <span
                      className="inline-block size-2 shrink-0 rounded-full"
                      style={{ background: '#C9A84C' }}
                    />
                  )}
                  <p
                    className="truncate text-xs"
                    style={{
                      color: isUnread ? '#1B2D5B' : '#7A8BA8',
                      fontWeight: isUnread ? 600 : 400,
                    }}
                  >
                    {conv.last_message}
                  </p>
                </div>
                <p className="mt-0.5 text-[10px]" style={{ color: '#7A8BA8' }}>
                  Room {conv.room_number}
                </p>
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
