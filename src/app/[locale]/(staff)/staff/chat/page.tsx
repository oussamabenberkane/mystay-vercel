'use client'

import { useState, useEffect, useCallback } from 'react'
import { MessageCircle } from 'lucide-react'
import { ConversationList } from '@/components/staff/conversation-list'
import { ChatPanel } from '@/components/staff/chat-panel'
import { PushPermissionPrompt } from '@/components/shared/push-permission-prompt'
import {
  getConversationsForStaffAction,
  type Conversation,
} from '@/lib/actions/chat'
import { useAuthStore } from '@/lib/store/auth-store'
import { createClient } from '@/lib/supabase/client'

export default function StaffChatPage() {
  const profile = useAuthStore((s) => s.profile)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [mobileView, setMobileView] = useState<'list' | 'thread'>('list')
  const [unreadStayIds, setUnreadStayIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getConversationsForStaffAction().then(({ conversations: loaded }) => {
      setConversations(loaded)
      setLoading(false)
    })
  }, [])

  // Single hotel-level subscription updates the conversation list
  useEffect(() => {
    if (!profile?.hotel_id) return

    const supabase = createClient()
    const channel = supabase
      .channel(`hotel-chat:${profile.hotel_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `hotel_id=eq.${profile.hotel_id}`,
        },
        (payload) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const newMsg = payload.new as any
          setConversations((prev) => {
            const existing = prev.find((c) => c.stay_id === newMsg.stay_id)
            if (existing) {
              const updated: Conversation = {
                ...existing,
                last_message: newMsg.content,
                last_message_at: newMsg.created_at,
              }
              return [updated, ...prev.filter((c) => c.stay_id !== newMsg.stay_id)]
            }
            // New stay with a message — reload list to get full details
            getConversationsForStaffAction().then(({ conversations: loaded }) => {
              setConversations(loaded)
            })
            return prev
          })

          setActiveConversation((active) => {
            if (newMsg.stay_id !== active?.stay_id) {
              setUnreadStayIds((prev) => new Set(prev).add(newMsg.stay_id))
            }
            return active
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.hotel_id])

  const handleSelectConversation = useCallback((conv: Conversation) => {
    setActiveConversation(conv)
    setMobileView('thread')
    setUnreadStayIds((prev) => {
      const next = new Set(prev)
      next.delete(conv.stay_id)
      return next
    })
  }, [])

  const handleBack = useCallback(() => {
    setMobileView('list')
    setActiveConversation(null)
  }, [])

  return (
    <div className="flex overflow-hidden" style={{ height: '100vh' }}>
      {/* Left panel: conversation list */}
      <div
        className={`flex flex-col border-r shrink-0 w-full md:w-80 ${
          mobileView === 'thread' ? 'hidden md:flex' : 'flex'
        }`}
        style={{
          background: '#FFFFFF',
          borderColor: 'rgba(27,45,91,0.08)',
        }}
      >
        {/* Panel header */}
        <div
          className="flex shrink-0 items-center gap-3 border-b px-4 py-4"
          style={{ borderColor: 'rgba(27,45,91,0.08)' }}
        >
          <div>
            <p
              className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: '#C9A84C' }}
            >
              Staff Portal
            </p>
            <h1
              className="font-heading text-lg font-bold"
              style={{ color: '#1B2D5B' }}
            >
              Guest Chats
            </h1>
          </div>
          {unreadStayIds.size > 0 && (
            <div
              className="ml-auto flex size-6 items-center justify-center rounded-full text-[11px] font-bold"
              style={{ background: '#C9A84C', color: '#FFFFFF' }}
            >
              {unreadStayIds.size}
            </div>
          )}
        </div>

        {/* Push prompt */}
        <PushPermissionPrompt />

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
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
          ) : (
            <ConversationList
              conversations={conversations}
              activeStayId={activeConversation?.stay_id ?? null}
              onSelect={handleSelectConversation}
              unreadStayIds={unreadStayIds}
            />
          )}
        </div>
      </div>

      {/* Right panel: chat thread */}
      <div
        className={`flex-1 flex-col ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}
        style={{ background: '#F8F0E8' }}
      >
        {activeConversation ? (
          <ChatPanel
            key={activeConversation.stay_id}
            stayId={activeConversation.stay_id}
            roomNumber={activeConversation.room_number}
            guestName={activeConversation.guest_name}
            checkIn={activeConversation.check_in}
            checkOut={activeConversation.check_out}
            onBack={handleBack}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <div
              className="mb-6 flex size-20 items-center justify-center rounded-3xl"
              style={{ background: 'rgba(27,45,91,0.06)' }}
            >
              <MessageCircle className="size-9" style={{ color: '#C9A84C' }} />
            </div>
            <p
              className="font-heading text-xl font-semibold"
              style={{ color: '#1B2D5B' }}
            >
              Select a conversation
            </p>
            <p className="mt-2 text-sm" style={{ color: '#7A8BA8' }}>
              Choose a guest from the list to view their messages.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
