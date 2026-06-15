/**
 * Shared "My Stay" brand identity marks.
 *
 * The app brand is ALWAYS "My Stay" — never a tenant's hotel name. These marks
 * mirror the crest used on the auth screens (concentric gold rings, cardinal
 * diamonds, "MS" monogram) so the pre-auth surface is visually continuous with
 * the rest of the product. No external logo asset exists; the mark is pure SVG
 * + CSS, so it stays crisp at any size and respects the brand tokens.
 */

type BrandCrestProps = {
  /** Outer diameter in px. Inner elements scale proportionally. */
  size?: number
  /** Whether the outer dashed ring slowly rotates (decorative). */
  spin?: boolean
  className?: string
}

export function BrandCrest({ size = 88, spin = true, className = '' }: BrandCrestProps) {
  const center = size / 2
  const rOuter = center - 4
  const rInner = center - 11
  const disc = Math.round(size * 0.64)
  const diamond = Math.max(6, Math.round(size * 0.08))
  const offset = -Math.round(diamond / 1.6)

  const cardinals: Array<React.CSSProperties> = [
    { top: offset, left: '50%', transform: 'translateX(-50%) rotate(45deg)' },
    { bottom: offset, left: '50%', transform: 'translateX(-50%) rotate(45deg)' },
    { left: offset, top: '50%', transform: 'translateY(-50%) rotate(45deg)' },
    { right: offset, top: '50%', transform: 'translateY(-50%) rotate(45deg)' },
  ]

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        className={`absolute inset-0 ${spin ? 'brand-crest-spin' : ''}`}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
      >
        <circle
          cx={center}
          cy={center}
          r={rOuter}
          stroke="#C9A84C"
          strokeWidth={size > 120 ? 1 : 0.75}
          strokeDasharray="4 6"
          strokeOpacity="0.5"
        />
      </svg>
      <svg className="absolute inset-0" width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
        <circle cx={center} cy={center} r={rInner} stroke="#C9A84C" strokeWidth="1" strokeOpacity="0.6" />
      </svg>
      <div
        className="relative flex items-center justify-center rounded-full"
        style={{
          width: disc,
          height: disc,
          background: 'rgba(201,168,76,0.1)',
          border: '1.5px solid #C9A84C',
        }}
      >
        <span
          className="font-heading font-bold text-[#C9A84C] leading-none select-none tracking-tight"
          style={{ fontSize: Math.round(disc * 0.36) }}
        >
          MS
        </span>
      </div>
      {cardinals.map((s, i) => (
        <div
          key={i}
          className="absolute"
          style={{ ...s, width: diamond, height: diamond, background: '#C9A84C' }}
        />
      ))}
    </div>
  )
}

type BrandWordmarkProps = {
  /** Show the small gold "kicker" line under the wordmark. */
  kicker?: string
  /** Text color of the wordmark itself. Defaults to cream (for navy bg). */
  tone?: 'light' | 'dark'
  className?: string
  size?: number
}

/** The "My Stay" wordmark with the flanking ornamental kicker rule. */
export function BrandWordmark({
  kicker,
  tone = 'light',
  className = '',
  size = 26,
}: BrandWordmarkProps) {
  const color = tone === 'light' ? '#F8F0E8' : '#1B2D5B'
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <h1
        className="font-heading font-bold tracking-[0.05em]"
        style={{ fontSize: size, color, lineHeight: 1.05 }}
      >
        My Stay
      </h1>
      {kicker && (
        <div className="mt-1.5 flex items-center gap-2">
          <span className="h-px w-5" style={{ background: 'rgba(201,168,76,0.45)' }} />
          <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#C9A84C]">
            {kicker}
          </span>
          <span className="h-px w-5" style={{ background: 'rgba(201,168,76,0.45)' }} />
        </div>
      )}
    </div>
  )
}
