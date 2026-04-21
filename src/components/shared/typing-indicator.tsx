'use client'

type Props = {
  senderName?: string
}

export function TypingIndicator({ senderName }: Props) {
  return (
    <div className="msg-rise flex justify-start">
      <div className="flex max-w-[78%] flex-col gap-1 items-start">
        {senderName && (
          <div className="flex items-center gap-1.5 px-1">
            <span
              className="text-[10px] font-semibold uppercase tracking-widest font-heading"
              style={{ color: '#C9A84C' }}
            >
              {senderName}
            </span>
          </div>
        )}
        <div
          className="px-4 py-3.5"
          style={{
            background: '#FFFFFF',
            borderRadius: '1.25rem 1.25rem 1.25rem 0.3rem',
            boxShadow: '0 1px 8px rgba(27,45,91,0.07)',
            borderLeft: '2px solid rgba(201,168,76,0.35)',
          }}
        >
          <div className="flex items-center gap-[5px]" style={{ height: '14px' }}>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="block rounded-full"
                style={{
                  width: '6px',
                  height: '6px',
                  background: '#C9A84C',
                  animation: `typing-dot 1.1s ease-in-out ${i * 0.18}s infinite`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
