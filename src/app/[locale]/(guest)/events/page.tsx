'use client'

import { useState, useEffect } from 'react'
import { CalendarDays } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { getAnnouncementsAction } from '@/lib/actions/announcements'

type Announcement = {
  id: string
  hotel_id: string
  title: string
  body: string
  category: string
  event_date: string | null
  is_active: boolean
  created_at: string
}

const CATEGORY_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  event: { bg: '#FEF3C7', color: '#92400E', label: 'Événement' },
  promo: { bg: '#D1FAE5', color: '#065F46', label: 'Promo' },
  info:  { bg: '#DBEAFE', color: '#1E40AF', label: 'Info' },
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function AnnouncementCard({ item }: { item: Announcement }) {
  const style = CATEGORY_STYLES[item.category] ?? CATEGORY_STYLES.info

  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-white"
      style={{ boxShadow: '0 2px 16px rgba(27,45,91,0.08)' }}
    >
      {/* Category badge */}
      <div className="absolute top-3 right-3">
        <span
          className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest"
          style={{ background: style.bg, color: style.color }}
        >
          {style.label}
        </span>
      </div>

      <div className="px-5 pt-5 pb-4">
        <h2
          className="font-heading pr-20 text-base font-bold leading-snug"
          style={{ color: '#1B2D5B' }}
        >
          {item.title}
        </h2>
        <p
          className="mt-2 line-clamp-3 text-sm leading-relaxed"
          style={{ color: '#7A8BA8' }}
        >
          {item.body}
        </p>

        {item.event_date && (
          <div
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5"
            style={{ background: '#F8F0E8' }}
          >
            <CalendarDays className="size-3.5" style={{ color: '#C9A84C' }} />
            <span className="text-xs font-medium" style={{ color: '#1B2D5B' }}>
              {formatDate(item.event_date)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div
      className="overflow-hidden rounded-2xl bg-white"
      style={{ boxShadow: '0 2px 16px rgba(27,45,91,0.08)' }}
    >
      <div className="space-y-3 px-5 py-5">
        <div className="flex justify-between">
          <div className="h-5 w-48 animate-pulse rounded-lg" style={{ background: '#EEE4D8' }} />
          <div className="h-5 w-16 animate-pulse rounded-full" style={{ background: '#EEE4D8' }} />
        </div>
        <div className="h-4 w-full animate-pulse rounded-lg" style={{ background: '#EEE4D8' }} />
        <div className="h-4 w-3/4 animate-pulse rounded-lg" style={{ background: '#EEE4D8' }} />
      </div>
    </div>
  )
}

export default function EventsPage() {
  const t = useTranslations('guest.events')
  const [items, setItems] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      const { announcements } = await getAnnouncementsAction()
      if (mounted) {
        setItems(announcements)
        setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  // Polling fallback — covers environments where WebSocket/Realtime is unavailable
  useEffect(() => {
    let mounted = true
    const interval = setInterval(async () => {
      const { announcements } = await getAnnouncementsAction()
      if (mounted) setItems(announcements)
    }, 30000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('announcements:hotel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcements' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const row = payload.new as Announcement
            if (row.is_active) {
              setItems((prev) => [row, ...prev])
            }
          } else if (payload.eventType === 'UPDATE') {
            const row = payload.new as Announcement
            setItems((prev) =>
              prev.map((a) => (a.id === row.id ? row : a)).filter((a) => a.is_active)
            )
          } else if (payload.eventType === 'DELETE') {
            const row = payload.old as { id: string }
            setItems((prev) => prev.filter((a) => a.id !== row.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <div className="min-h-screen" style={{ background: '#F8F0E8' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-30 border-b px-4 py-4"
        style={{ background: '#F8F0E8', borderColor: 'rgba(27,45,91,0.08)' }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: '#C9A84C' }}
        >
          HELIOS Hotel
        </p>
        <h1
          className="font-heading text-2xl font-bold leading-tight"
          style={{ color: '#1B2D5B' }}
        >
          {t('title')}
        </h1>
      </div>

      <div className="px-4 py-6">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div
              className="mb-5 flex size-20 items-center justify-center rounded-3xl"
              style={{ background: 'rgba(201,168,76,0.1)' }}
            >
              <CalendarDays className="size-10" style={{ color: '#C9A84C' }} />
            </div>
            <h2
              className="font-heading text-xl font-semibold"
              style={{ color: '#1B2D5B' }}
            >
              {t('empty')}
            </h2>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <AnnouncementCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
