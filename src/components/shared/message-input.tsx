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
  const [focused, setFocused] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    if (ref.current) {
      ref.current.style.height = 'auto'
    }
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
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  const canSend = value.trim().length > 0 && !disabled

  return (
    <div
      className="shrink-0 px-4 py-3"
      style={{
        background: '#FFFFFF',
        borderTop: '1px solid rgba(27,45,91,0.07)',
        boxShadow: '0 -4px 20px rgba(27,45,91,0.04)',
      }}
    >
      <div
        className="flex items-end gap-2.5 rounded-2xl px-3 py-2 transition-all duration-200"
        style={{
          background: '#F8F0E8',
          border: `1.5px solid ${focused ? 'rgba(201,168,76,0.5)' : 'rgba(27,45,91,0.08)'}`,
          boxShadow: focused ? '0 0 0 3px rgba(201,168,76,0.08)' : 'none',
        }}
      >
        <textarea
          ref={ref}
          rows={1}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className="flex-1 resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:opacity-50"
          style={{
            color: '#1B2D5B',
            minHeight: '24px',
            maxHeight: '120px',
            overflow: 'hidden',
            paddingTop: '2px',
            paddingBottom: '2px',
          }}
        />

        <button
          onClick={handleSend}
          disabled={!canSend}
          className="flex size-8 shrink-0 items-center justify-center rounded-xl transition-all duration-150 active:scale-90"
          style={{
            background: canSend ? '#1B2D5B' : 'transparent',
            border: canSend ? 'none' : '1.5px solid rgba(27,45,91,0.15)',
            marginBottom: '1px',
          }}
          aria-label="Send message"
        >
          <Send
            className="size-3.5"
            style={{
              color: canSend ? '#C9A84C' : 'rgba(27,45,91,0.3)',
              transform: 'rotate(-5deg)',
            }}
          />
        </button>
      </div>

      <p className="mt-1.5 text-center text-[10px]" style={{ color: 'rgba(27,45,91,0.25)' }}>
        Press Enter to send · Shift+Enter for new line
      </p>
    </div>
  )
}
