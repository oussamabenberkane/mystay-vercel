'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { MessageBubble } from '@/components/shared/message-bubble'
import { MessageInput } from '@/components/shared/message-input'
import {
  sendMessageAction,
  getMessagesForStayAction,
  type MessageWithSender,
} from '@/lib/actions/chat'
import { getActiveStayAction } from '@/lib/actions/room-service'
import { useAuthStore } from '@/lib/store/auth-store'
import { createClient } from '@/lib/supabase/client'

type ExtendedMessage = MessageWithSender & { isOptimistic?: boolean }

function findLastOptimistic(messages: ExtendedMessage[], senderId: string, content: string): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].isOptimistic && messages[i].sender_id === senderId && messages[i].content === content) {
      return i
    }
  }
  return -1
}

export default function GuestChatPage() {
  const profile = useAuthStore((s) => s.profile)
  const t = useTranslations('guest.chat')
  const [messages, setMessages] = useState<ExtendedMessage[]>([])
  const [stayId, setStayId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' })
  }, [])

  useEffect(() => {
    async function init() {
      const { stay } = await getActiveStayAction()
      if (!stay) {
        setLoading(false)
        return
      }
      setStayId(stay.id)
      const { messages: loaded } = await getMessagesForStayAction(stay.id)
      setMessages(loaded)
      setLoading(false)
      setTimeout(() => scrollToBottom(false), 50)
    }
    init()
  }, [scrollToBottom])

  useEffect(() => {
    if (!stayId) return
    const supabase = createClient()
    const channel = supabase
      .channel(`chat:${stayId}`)
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
      if (!profile || !stayId || sending) return
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
    <div
      className="flex flex-col overflow-hidden"
      style={{ height: 'calc(100dvh - 64px)', background: '#F8F0E8' }}
    >
      {/* Chat header */}
      <div
        className="shrink-0 border-b"
        style={{
          background: '#FFFFFF',
          borderColor: 'rgba(27,45,91,0.08)',
          boxShadow: '0 1px 8px rgba(27,45,91,0.05)',
        }}
      >
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: '#1B2D5B' }}
          >
            <MessageCircle className="size-5" style={{ color: '#C9A84C' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: '#C9A84C' }}
            >
              Hotel Concierge
            </p>
            <p
              className="font-heading text-[15px] font-bold leading-tight"
              style={{ color: '#1B2D5B' }}
            >
              {t('title')}
            </p>
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
            <span className="text-xs" style={{ color: '#7A8BA8' }}>
              Online
            </span>
          </div>
        </div>

        <div className="h-2" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 px-4 py-4">
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
        ) : !stayId ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <p className="text-sm font-medium" style={{ color: '#7A8BA8' }}>
              No active stay found
            </p>
            <p className="mt-1 text-xs" style={{ color: '#7A8BA8' }}>
              Please contact reception to activate your stay.
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div
              className="mb-4 flex size-16 items-center justify-center rounded-3xl"
              style={{ background: 'rgba(27,45,91,0.06)' }}
            >
              <MessageCircle className="size-8" style={{ color: '#C9A84C' }} />
            </div>
            <p
              className="font-heading text-lg font-semibold"
              style={{ color: '#1B2D5B' }}
            >
              {t('empty')}
            </p>
            <p className="mt-1.5 text-sm" style={{ color: '#7A8BA8' }}>
              Our concierge team is here to help with anything you need during your stay.
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

      {/* Input — only when stay exists */}
      {stayId && (
        <MessageInput onSend={handleSend} disabled={sending || !profile} placeholder={t('placeholder')} />
      )}
    </div>
  )
}
