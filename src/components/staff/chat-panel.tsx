'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowLeft, Calendar } from 'lucide-react'
import { MessageBubble } from '@/components/shared/message-bubble'
import { TypingIndicator } from '@/components/shared/typing-indicator'
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
  const [isTyping, setIsTyping] = useState(false)
  const [newMsgIds, setNewMsgIds] = useState<Set<string>>(new Set())

  const bottomRef = useRef<HTMLDivElement>(null)
  const shownIdsRef = useRef(new Set<string>())
  const pendingIdsRef = useRef(new Set<string>())
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)
  const profileRef = useRef(profile)

  useEffect(() => { profileRef.current = profile }, [profile])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    }
  }, [])

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' })
  }, [])

  const revealMessages = useCallback((msgs: ExtendedMessage[]) => {
    if (!mountedRef.current) return
    typingTimerRef.current = null
    msgs.forEach((m) => pendingIdsRef.current.delete(m.id))
    setIsTyping(false)
    setMessages((prev) => {
      const ids = new Set(prev.map((m) => m.id))
      const fresh = msgs.filter((m) => !ids.has(m.id))
      return fresh.length === 0 ? prev : [...prev, ...fresh]
    })
    setNewMsgIds((prev) => {
      const next = new Set(prev)
      msgs.forEach((m) => next.add(m.id))
      return next
    })
    scrollToBottom()
    setTimeout(() => {
      if (!mountedRef.current) return
      setNewMsgIds((prev) => {
        const next = new Set(prev)
        msgs.forEach((m) => next.delete(m.id))
        return next
      })
    }, 2500)
  }, [scrollToBottom])

  const showIncoming = useCallback((msgs: MessageWithSender[]) => {
    msgs.forEach((m) => pendingIdsRef.current.add(m.id))
    if (typingTimerRef.current) return
    setIsTyping(true)
    const delay = Math.min(1400, Math.max(700, msgs[0].content.length * 10))
    typingTimerRef.current = setTimeout(() => revealMessages(msgs as ExtendedMessage[]), delay)
  }, [revealMessages])

  // Initial load
  useEffect(() => {
    setLoading(true)
    setMessages([])
    shownIdsRef.current = new Set()
    pendingIdsRef.current = new Set()
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current)
      typingTimerRef.current = null
    }
    setIsTyping(false)
    setNewMsgIds(new Set())

    getMessagesForStayAction(stayId).then(({ messages: loaded }) => {
      if (!mountedRef.current) return
      shownIdsRef.current = new Set(loaded.map((m) => m.id))
      setMessages(loaded)
      setLoading(false)
      setTimeout(() => scrollToBottom(false), 50)
    })
  }, [stayId, scrollToBottom])

  // Polling fallback — 2s
  useEffect(() => {
    if (!stayId) return
    const interval = setInterval(async () => {
      if (!mountedRef.current) return
      const { messages: polled } = await getMessagesForStayAction(stayId)

      const incoming = polled.filter(
        (m) => !shownIdsRef.current.has(m.id) && m.sender_id !== profileRef.current?.id
      )

      incoming.forEach((m) => shownIdsRef.current.add(m.id))

      setMessages((prev) => {
        const optimistics = prev.filter((m) => m.isOptimistic)
        const remaining = optimistics.filter(
          (opt) => !polled.some((m) => m.sender_id === opt.sender_id && m.content === opt.content)
        )
        const knownShown = polled.filter(
          (m) => shownIdsRef.current.has(m.id) && !pendingIdsRef.current.has(m.id)
        )
        return [...knownShown, ...remaining]
      })

      if (incoming.length > 0) showIncoming(incoming)
    }, 2000)
    return () => clearInterval(interval)
  }, [stayId, showIncoming])

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`chat-panel:${stayId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `stay_id=eq.${stayId}` },
        (payload) => {
          const newMsg = payload.new as MessageWithSender
          if (shownIdsRef.current.has(newMsg.id)) return
          shownIdsRef.current.add(newMsg.id)

          if (newMsg.sender_id === profileRef.current?.id) {
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
          } else {
            showIncoming([newMsg])
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [stayId, showIncoming, scrollToBottom])

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
            <ArrowLeft className="size-4.5" style={{ color: '#1B2D5B' }} />
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
          <span className="text-[11px]" style={{ color: '#7A8BA8' }}>Room {roomNumber}</span>
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4"
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
        ) : messages.length === 0 && !isTyping ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium" style={{ color: '#7A8BA8' }}>No messages yet</p>
            <p className="mt-1 text-xs" style={{ color: '#7A8BA8' }}>Send a message to start the conversation</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((msg) => (
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
                  isNew={newMsgIds.has(msg.id)}
                />
              </div>
            ))}
            {isTyping && <TypingIndicator senderName={guestName} />}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <MessageInput onSend={handleSend} disabled={sending} />
    </div>
  )
}
