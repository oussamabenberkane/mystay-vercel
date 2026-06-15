'use client'

import { useCallback, useState } from 'react'

// ---------------------------------------------------------------------------
// Toast hook + viewport — shared by all marketing sections
// ---------------------------------------------------------------------------

export type ToastMsg = { id: number; message: string; isError: boolean }

export function useToasts() {
  const [toasts, setToasts] = useState<ToastMsg[]>([])

  const showToast = useCallback((message: string, isError = false) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, isError }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }, [])

  return { toasts, showToast }
}

export function ToastViewport({ toasts }: { toasts: ToastMsg[] }) {
  return (
    <div className="pointer-events-none fixed top-4 left-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="rounded-2xl px-4 py-3 text-sm font-semibold shadow-lg"
          style={{
            background: t.isError ? '#FEF2F2' : '#F0FDF4',
            color: t.isError ? '#991B1B' : '#166534',
          }}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Form field primitives
// ---------------------------------------------------------------------------

export function FieldLabel({
  children,
  optional,
}: {
  children: React.ReactNode
  optional?: string
}) {
  return (
    <p className="mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: '#7A8BA8' }}>
      {children}
      {optional && <span className="normal-case font-normal"> ({optional})</span>}
    </p>
  )
}

const inputStyle = {
  borderColor: 'rgba(27,45,91,0.15)',
  color: '#1B2D5B',
  // @ts-expect-error CSS variable for focus ring
  '--tw-ring-color': '#C9A84C',
} as React.CSSProperties

export function TextField(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-2"
      style={inputStyle}
    />
  )
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full resize-none rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-2"
      style={inputStyle}
    />
  )
}

// ---------------------------------------------------------------------------
// Delete confirmation modal
// ---------------------------------------------------------------------------

export function DeleteConfirm({
  title,
  description,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string
  description: string
  cancelLabel: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(27,45,91,0.4)' }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6" style={{ boxShadow: '0 8px 40px rgba(27,45,91,0.14)' }}>
        <p className="font-heading text-lg font-bold mb-2" style={{ color: '#1B2D5B' }}>
          {title}
        </p>
        <p className="text-sm mb-6" style={{ color: '#7A8BA8' }}>
          {description}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 cursor-pointer rounded-xl border py-2.5 text-sm font-semibold transition-colors hover:bg-gray-50"
            style={{ borderColor: 'rgba(27,45,91,0.12)', color: '#7A8BA8' }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 cursor-pointer rounded-xl py-2.5 text-sm font-semibold transition-colors hover:opacity-90"
            style={{ background: '#C0392B', color: '#FFF' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Add / submit buttons
// ---------------------------------------------------------------------------

export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex cursor-pointer items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.97]"
      style={{ background: '#1B2D5B', color: '#F8F0E8' }}
    >
      <span className="text-base leading-none" style={{ color: '#C9A84C' }}>
        +
      </span>
      {label}
    </button>
  )
}

export function SubmitButton({
  label,
  disabled,
}: {
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="w-full cursor-pointer rounded-2xl py-4 text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      style={{ background: '#1B2D5B', color: '#F8F0E8', minHeight: '52px' }}
    >
      {label}
    </button>
  )
}
