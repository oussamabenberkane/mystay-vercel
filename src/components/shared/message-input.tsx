'use client'

import { useState, useRef, useCallback } from 'react'
import { Send } from 'lucide-react'

type Props = {
  onSend: (content: string) => void
  disabled?: boolean
  placeholder?: string
}

export function MessageInput({ onSend, disabled, placeholder = 'Type a message…' }: Props) {
  const [value, setValue] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    if (ref.current) ref.current.style.height = 'auto'
  }, [value, disabled, onSend])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 96) + 'px'
  }

  return (
    <div
      className="flex items-end gap-3 px-4 py-3 shrink-0"
      style={{ background: '#FFFFFF', borderTop: '1px solid rgba(27,45,91,0.08)' }}
    >
      <textarea
        ref={ref}
        rows={1}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1 resize-none rounded-2xl border px-4 py-2.5 text-sm leading-relaxed outline-none transition-colors"
        style={{
          borderColor: 'rgba(27,45,91,0.1)',
          background: '#F8F0E8',
          color: '#1B2D5B',
          minHeight: '42px',
          maxHeight: '96px',
        }}
      />
      <button
        onClick={handleSend}
        disabled={!value.trim() || disabled}
        className="flex size-[42px] shrink-0 items-center justify-center rounded-xl transition-all active:scale-95 disabled:opacity-40"
        style={{ background: '#1B2D5B' }}
        aria-label="Send message"
      >
        <Send className="size-4" style={{ color: '#C9A84C' }} />
      </button>
    </div>
  )
}
