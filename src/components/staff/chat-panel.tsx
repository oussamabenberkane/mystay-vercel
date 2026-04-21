'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowLeft, Calendar } from 'lucide-react'
import { MessageBubble } from '@/components/shared/message-bubble'
import { MessageInput } from '@/components/shared/message-input'
import {
  sendMessageAction,
  getMessagesForStayAction,
  type MessageWithSender,
} from '@/lib/actions/chat'
import { useAuthStore } from '@/lib/store/auth-store'
import { createClient } from '@/lib/supabase/client'

type Props = {
  stayId: string
  roomNumber: string
  guestName: string
  checkIn: string
  checkOut: string
  onBack?: () => void
}

type ExtendedMessage = MessageWithSender & { isOptimistic?: boolean }

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function findLastOptimistic(messages: ExtendedMessage[], senderId: string, content: string): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].isOptimistic && messages[i].sender_id === senderId && messages[i].content === content) {
      return i
    }
  }
  return -1
}

export function ChatPanel({ stayId, roomNumber, guestName, checkIn, checkOut, onBack }: Props) {
  const profile = useAuthStore((s) => s.profile)
  const [messages, setMessages] = useState<ExtendedMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' })
  }, [])

  useEffect(() => {
    setLoading(true)
    setMessages([])
    getMessagesForStayAction(stayId).then(({ messages: loaded }) => {
      setMessages(loaded)
      setLoading(false)
      setTimeout(() => scrollToBottom(false), 50)
    })
  }, [stayId, scrollToBottom])

  useEffect(() => {
    const interval = setInterval(async () => {
      const { messages: polled } = await getMessagesForStayAction(stayId)
      setMessages((prev) => {
        const optimistics = prev.filter((m) => m.isOptimistic)
        const remaining = optimistics.filter(
          (opt) => !polled.some((m) => m.sender_id === opt.sender_id && m.content === opt.content)
        )
        const prevRealCount = prev.filter((m) => !m.isOptimistic).length
        if (polled.length > prevRealCount) setTimeout(() => scrollToBottom(), 0)
        return [...polled, ...remaining]
      })
    }, 5000)
    return () => clearInterval(interval)
  }, [stayId, scrollToBottom])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`chat-panel:${stayId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `stay_id=eq.${stayId}` },
        (payload) => {
          const newMsg = payload.new as MessageWithSender
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev
            const optIdx = findLastOptimistic(prev, newMsg.sender_id, newMsg.content)
            if (optIdx >= 0) {
              const updated = [...prev]
              updated[optIdx] = { ...newMsg }
              return updated
            }
            return [...prev, newMsg]
          })
          scrollToBottom()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [stayId, scrollToBottom])

  const handleSend = useCallback(
    async (content: string) => {
      if (!profile || sending) return
      setSending(true)

      const optimisticId = `opt-${Date.now()}`
      const optimistic: ExtendedMessage = {
        id: optimisticId,
        stay_id: stayId,
        hotel_id: profile.hotel_id,
        sender_id: profile.id,
        content,
        created_at: new Date().toISOString(),
        sender_name: profile.full_name,
        sender_role: profile.role,
        isOptimistic: true,
      }
      setMessages((prev) => [...prev, optimistic])
      scrollToBottom()

      const { error } = await sendMessageAction(content, stayId)
      if (error) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
      }
      setSending(false)
    },
    [profile, stayId, sending, scrollToBottom]
  )

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div
        className="flex shrink-0 items-center gap-3 border-b px-4 py-3.5"
        style={{ background: '#FFFFFF', borderColor: 'rgba(27,45,91,0.08)', boxShadow: '0 1px 8px rgba(27,45,91,0.05)' }}
      >
        {onBack && (
          <button
            onClick={onBack}
            className="flex size-9 items-center justify-center rounded-xl transition-all active:scale-95 md:hidden"
            style={{ background: '#F8F0E8' }}
            aria-label="Back to conversations"
          >
            <ArrowLeft className="size-[18px]" style={{ color: '#1B2D5B' }} />
          </button>
        )}

        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold"
          style={{ background: '#C9A84C', color: '#FFFFFF' }}
        >
          {roomNumber}
        </div>

        <div className="flex-1 min-w-0">
          <p className="truncate font-heading text-[15px] font-bold" style={{ color: '#1B2D5B' }}>
            {guestName}
          </p>
          {checkIn && checkOut && (
            <div className="mt-0.5 flex items-center gap-1.5">
              <Calendar className="size-3 shrink-0" style={{ color: '#7A8BA8' }} />
              <p className="text-[11px]" style={{ color: '#7A8BA8' }}>
                {formatDate(checkIn)} — {formatDate(checkOut)}
              </p>
            </div>
          )}
        </div>

        {/* Online indicator */}
        <div className="flex items-center gap-1.5">
          <span className="relative flex size-2.5">
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
              style={{ background: '#4ade80' }}
            />
            <span
              className="relative inline-flex size-2.5 rounded-full"
              style={{ background: '#22c55e' }}
            />
          </span>
          <span className="text-[11px]" style={{ color: '#7A8BA8' }}>
            Room {roomNumber}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto space-y-3 px-4 py-4"
        style={{ background: '#F8F0E8' }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="size-2 rounded-full animate-bounce"
                  style={{ background: '#C9A84C', animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium" style={{ color: '#7A8BA8' }}>
              No messages yet
            </p>
            <p className="mt-1 text-xs" style={{ color: '#7A8BA8' }}>
              Send a message to start the conversation
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              style={{ opacity: msg.isOptimistic ? 0.7 : 1, transition: 'opacity 0.2s' }}
            >
              <MessageBubble
                content={msg.content}
                senderName={msg.sender_name}
                senderRole={msg.sender_role}
                createdAt={msg.created_at}
                isOwn={msg.sender_id === profile?.id}
              />
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <MessageInput onSend={handleSend} disabled={sending} />
    </div>
  )
}
