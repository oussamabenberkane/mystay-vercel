'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Sparkles } from 'lucide-react'
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
  const messagesRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback((smooth = true) => {
    const el = messagesRef.current
    if (!el) return
    if (smooth) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    } else {
      el.scrollTop = el.scrollHeight
    }
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
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: '64px' }}
    >
      {/* Header */}
      <div
        className="shrink-0"
        style={{
          background: '#1B2D5B',
          boxShadow: '0 2px 16px rgba(27,45,91,0.18)',
        }}
      >
        <div className="flex items-center gap-3 px-4 py-4">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-xl"
            style={{
              background: 'rgba(201,168,76,0.15)',
              border: '1px solid rgba(201,168,76,0.3)',
            }}
          >
            <Sparkles className="size-4.5" style={{ color: '#C9A84C' }} />
          </div>

          <div className="flex-1 min-w-0">
            <p
              className="text-[9px] font-semibold uppercase tracking-[0.15em]"
              style={{ color: 'rgba(201,168,76,0.7)' }}
            >
              Hotel Concierge
            </p>
            <p
              className="font-heading text-[16px] font-bold leading-tight"
              style={{ color: '#F8F0E8' }}
            >
              {t('title')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="relative flex size-2">
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                style={{ background: '#4ade80' }}
              />
              <span
                className="relative inline-flex size-2 rounded-full"
                style={{ background: '#22c55e' }}
              />
            </span>
            <span
              className="text-[11px] font-medium"
              style={{ color: 'rgba(248,240,232,0.6)' }}
            >
              Available
            </span>
          </div>
        </div>

        {/* Gold ornament rule */}
        <div
          className="mx-4 mb-3"
          style={{
            height: '1px',
            background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.4), transparent)',
          }}
        />
      </div>

      {/* Messages */}
      <div
        ref={messagesRef}
        className="flex-1 overflow-y-auto px-4 py-5"
        style={{
          background: '#F8F0E8',
          backgroundImage: `
            repeating-linear-gradient(
              45deg,
              transparent,
              transparent 60px,
              rgba(201,168,76,0.025) 60px,
              rgba(201,168,76,0.025) 61px
            )
          `,
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-20">
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
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <p className="font-heading text-base font-semibold" style={{ color: '#1B2D5B' }}>
              No active stay found
            </p>
            <p className="mt-1.5 text-sm" style={{ color: '#7A8BA8' }}>
              Please contact reception to activate your stay.
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div
              className="mb-5 flex size-16 items-center justify-center rounded-2xl"
              style={{
                background: '#FFFFFF',
                border: '1px solid rgba(201,168,76,0.2)',
                boxShadow: '0 4px 20px rgba(27,45,91,0.08)',
              }}
            >
              <Sparkles className="size-7" style={{ color: '#C9A84C' }} />
            </div>
            <p className="font-heading text-xl font-bold" style={{ color: '#1B2D5B' }}>
              {t('empty')}
            </p>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: '#7A8BA8' }}>
              Our concierge team is here to help with anything you need during your stay.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{ opacity: msg.isOptimistic ? 0.65 : 1, transition: 'opacity 0.3s' }}
              >
                <MessageBubble
                  content={msg.content}
                  senderName={msg.sender_name}
                  senderRole={msg.sender_role}
                  createdAt={msg.created_at}
                  isOwn={msg.sender_id === profile?.id}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {stayId && (
        <MessageInput onSend={handleSend} disabled={sending} placeholder={t('placeholder')} />
      )}
    </div>
  )
}
