'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Star, MessageSquare, AlertCircle, ThumbsUp, CheckCircle2 } from 'lucide-react'
import { submitFeedbackAction, getMyFeedbackAction } from '@/lib/actions/feedback'

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform active:scale-90"
        >
          <Star
            className="size-9"
            fill={(hovered || value) >= star ? '#C9A84C' : 'none'}
            stroke={(hovered || value) >= star ? '#C9A84C' : '#7A8BA8'}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  )
}

const RATING_LABELS: Record<number, string> = {
  1: 'Très insatisfait',
  2: 'Insatisfait',
  3: 'Correct',
  4: 'Satisfait',
  5: 'Excellent',
}

export default function FeedbackPage() {
  const t = useTranslations('guest.feedback')
  const [rating, setRating] = useState(0)
  const [remarks, setRemarks] = useState('')
  const [complaints, setComplaints] = useState('')
  const [impressions, setImpressions] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existing, setExisting] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMyFeedbackAction().then(({ feedback }) => {
      if (feedback) {
        setExisting(feedback)
        setRating(feedback.rating ?? 0)
        setRemarks(feedback.remarks ?? '')
        setComplaints(feedback.complaints ?? '')
        setImpressions(feedback.impressions ?? '')
        setSubmitted(true)
      }
      setLoading(false)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rating === 0) { setError(t('ratingRequired')); return }
    setSubmitting(true)
    setError(null)
    const result = await submitFeedbackAction({ rating, remarks, complaints, impressions })
    setSubmitting(false)
    if (result.error) { setError(result.error); return }
    setSubmitted(true)
    setExisting({ rating, remarks, complaints, impressions, created_at: new Date().toISOString() })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F8F0E8' }}>
        <div className="size-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#C9A84C', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: '#F8F0E8' }}>
      {/* Header */}
      <div className="sticky top-0 z-30 border-b px-4 py-4" style={{ background: '#F8F0E8', borderColor: 'rgba(27,45,91,0.08)' }}>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#C9A84C' }}>
          {t('subtitle')}
        </p>
        <h1 className="font-heading text-2xl font-bold leading-tight" style={{ color: '#1B2D5B' }}>
          {t('title')}
        </h1>
      </div>

      <div className="px-4 py-6 max-w-2xl mx-auto space-y-5">

        {submitted && existing ? (
          /* ── Submitted state ── */
          <div className="space-y-5">
            <div
              className="rounded-3xl p-6 flex flex-col items-center text-center gap-3"
              style={{ background: 'rgba(201,168,76,0.08)', border: '1.5px solid rgba(201,168,76,0.25)' }}
            >
              <CheckCircle2 className="size-12" style={{ color: '#C9A84C' }} />
              <h2 className="font-heading text-xl font-bold" style={{ color: '#1B2D5B' }}>
                {t('thankYou')}
              </h2>
              <p className="text-sm" style={{ color: '#7A8BA8' }}>
                {t('submittedMsg')}
              </p>
              <div className="flex gap-1 mt-1">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className="size-6" fill={existing.rating >= s ? '#C9A84C' : 'none'} stroke={existing.rating >= s ? '#C9A84C' : '#D1D5DB'} strokeWidth={1.5} />
                ))}
              </div>
            </div>

            {existing.remarks && (
              <SummaryCard icon={MessageSquare} label={t('remarksLabel')} text={existing.remarks} />
            )}
            {existing.complaints && (
              <SummaryCard icon={AlertCircle} label={t('complaintsLabel')} text={existing.complaints} />
            )}
            {existing.impressions && (
              <SummaryCard icon={ThumbsUp} label={t('impressionsLabel')} text={existing.impressions} />
            )}
          </div>
        ) : (
          /* ── Form ── */
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Rating */}
            <div className="rounded-2xl p-5 bg-white" style={{ boxShadow: '0 2px 16px rgba(27,45,91,0.07)' }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#7A8BA8' }}>
                {t('ratingLabel')}
              </p>
              <p className="text-sm font-medium mb-4" style={{ color: '#1B2D5B' }}>
                {t('ratingQuestion')}
              </p>
              <StarRating value={rating} onChange={setRating} />
              {rating > 0 && (
                <p className="mt-3 text-sm font-semibold" style={{ color: '#C9A84C' }}>
                  {RATING_LABELS[rating]}
                </p>
              )}
            </div>

            {/* Remarks */}
            <FeedbackTextarea
              icon={MessageSquare}
              label={t('remarksLabel')}
              placeholder={t('remarksPlaceholder')}
              value={remarks}
              onChange={setRemarks}
              color="#3B82F6"
            />

            {/* Complaints */}
            <FeedbackTextarea
              icon={AlertCircle}
              label={t('complaintsLabel')}
              placeholder={t('complaintsPlaceholder')}
              value={complaints}
              onChange={setComplaints}
              color="#EF4444"
            />

            {/* Final impressions */}
            <FeedbackTextarea
              icon={ThumbsUp}
              label={t('impressionsLabel')}
              placeholder={t('impressionsPlaceholder')}
              value={impressions}
              onChange={setImpressions}
              color="#10B981"
            />

            {error && (
              <p className="rounded-xl px-4 py-3 text-sm font-medium" style={{ background: '#FEF2F2', color: '#991B1B' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl py-4 text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              style={{ background: '#1B2D5B', color: '#F8F0E8', minHeight: '52px' }}
            >
              {submitting ? t('submitting') : t('submit')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function FeedbackTextarea({
  icon: Icon,
  label,
  placeholder,
  value,
  onChange,
  color,
}: {
  icon: React.ElementType
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  color: string
}) {
  return (
    <div className="rounded-2xl p-5 bg-white" style={{ boxShadow: '0 2px 16px rgba(27,45,91,0.07)' }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="flex size-8 items-center justify-center rounded-lg" style={{ background: `${color}15` }}>
          <Icon className="size-4" style={{ color }} />
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#7A8BA8' }}>
          {label}
        </p>
      </div>
      <textarea
        rows={3}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full resize-none rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-2"
        style={{
          borderColor: 'rgba(27,45,91,0.12)',
          color: '#1B2D5B',
          background: '#FAFAFA',
          // @ts-expect-error CSS variable
          '--tw-ring-color': '#C9A84C',
        }}
      />
    </div>
  )
}

function SummaryCard({ icon: Icon, label, text }: { icon: React.ElementType; label: string; text: string }) {
  return (
    <div className="rounded-2xl p-5 bg-white" style={{ boxShadow: '0 2px 16px rgba(27,45,91,0.07)' }}>
      <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#7A8BA8' }}>
        {label}
      </p>
      <p className="text-sm leading-relaxed" style={{ color: '#1B2D5B' }}>{text}</p>
    </div>
  )
}
