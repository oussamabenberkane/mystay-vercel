'use client'

import { useState, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v4'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { loginAction } from '@/lib/actions/auth'

const TEST_ACCOUNTS = [
  {
    role: 'Admin',
    email: 'admin@legrand.com',
    password: 'Admin1234!',
    icon: '◈',
    tagline: 'Full system control',
    capabilities: ['Manage rooms, guests & bookings', 'View reports & analytics', 'Configure hotel settings & staff'],
  },
  {
    role: 'Staff',
    email: 'staff1@legrand.com',
    password: 'Staff1234!',
    icon: '◉',
    tagline: 'Hotel operations',
    capabilities: ['Process & fulfill guest orders', 'Update room status in real-time', 'Handle service requests'],
  },
  {
    role: 'Guest',
    email: 'guest1@legrand.com',
    password: 'Guest1234!',
    icon: '◌',
    tagline: 'Guest portal',
    capabilities: ['Browse hotel services & amenities', 'Request room service & extras', 'View stay details & receipts'],
  },
] as const

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginForm = z.infer<typeof loginSchema>

function HotelCrest() {
  return (
    <div className="auth-up-1 relative flex items-center justify-center" style={{ width: 88, height: 88 }}>
      {/* Outer slow-spinning dashed ring */}
      <svg
        className="crest-ring-outer absolute inset-0"
        width="88" height="88" viewBox="0 0 88 88"
        fill="none"
      >
        <circle
          cx="44" cy="44" r="40"
          stroke="#C9A84C"
          strokeWidth="0.75"
          strokeDasharray="4 6"
          strokeOpacity="0.5"
        />
      </svg>
      {/* Static solid ring */}
      <svg className="absolute inset-0" width="88" height="88" viewBox="0 0 88 88" fill="none">
        <circle cx="44" cy="44" r="33" stroke="#C9A84C" strokeWidth="1" strokeOpacity="0.6" />
      </svg>
      {/* Inner filled disc */}
      <div
        className="relative flex items-center justify-center rounded-full"
        style={{ width: 56, height: 56, background: 'rgba(201,168,76,0.1)', border: '1.5px solid #C9A84C' }}
      >
        <span className="font-heading text-[22px] font-bold text-[#C9A84C] leading-none select-none">MS</span>
      </div>
      {/* Four cardinal diamonds */}
      {[
        { top: '-4px', left: '50%', transform: 'translateX(-50%)' },
        { bottom: '-4px', left: '50%', transform: 'translateX(-50%)' },
        { left: '-4px', top: '50%', transform: 'translateY(-50%)' },
        { right: '-4px', top: '50%', transform: 'translateY(-50%)' },
      ].map((s, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            ...s,
            width: 7, height: 7,
            background: '#C9A84C',
            transform: `${s.transform ?? ''} rotate(45deg)`.trim(),
          }}
        />
      ))}
    </div>
  )
}

function OrnamentalDivider() {
  return (
    <div className="flex items-center gap-2 my-6">
      <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.5))' }} />
      <svg width="8" height="8" viewBox="0 0 8 8" fill="#C9A84C" opacity="0.8">
        <path d="M4 0L8 4L4 8L0 4Z" />
      </svg>
      <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, rgba(201,168,76,0.5))' }} />
    </div>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const params = useParams()
  const locale = (params.locale as string) || 'en'
  const [serverError, setServerError] = useState<string | null>(null)
  const [hoveredRole, setHoveredRole] = useState<string | null>(null)
  const [tappedRole, setTappedRole] = useState<string | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const t = useTranslations('auth')

  useEffect(() => {
    function onTouchOutside(e: TouchEvent) {
      if (gridRef.current && !gridRef.current.contains(e.target as Node)) {
        setTappedRole(null)
      }
    }
    document.addEventListener('touchstart', onTouchOutside)
    return () => document.removeEventListener('touchstart', onTouchOutside)
  }, [])

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  async function loginAsTestAccount(email: string, password: string) {
    setValue('email', email)
    setValue('password', password)
    await onSubmit({ email, password })
  }

  async function onSubmit(data: LoginForm) {
    setServerError(null)
    const result = await loginAction(data)
    if (result.error) {
      setServerError(result.error)
      return
    }
    if (result.role === 'staff') router.push(`/${locale}/staff/orders`)
    else if (result.role === 'admin') router.push(`/${locale}/admin/operations`)
    else router.push(`/${locale}/dashboard`)
  }

  return (
    <div className="auth-card">
      {/* ── Two-tone card ── */}
      <div
        className="rounded-3xl"
        style={{ boxShadow: '0 16px 56px rgba(27,45,91,0.18), 0 2px 8px rgba(27,45,91,0.08), inset 0 1px 0 rgba(255,255,255,0.06)' }}
      >

        {/* ▓ Navy header vault */}
        <div
          className="relative px-8 pt-9 pb-8 flex flex-col items-center overflow-hidden rounded-t-3xl"
          style={{ background: '#1B2D5B' }}
        >
          {/* Subtle radial warmth from top */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(201,168,76,0.10) 0%, transparent 70%)',
          }} />

          {/* Corner L-brackets */}
          {[
            'top-3 left-3 border-t border-l',
            'top-3 right-3 border-t border-r',
            'bottom-3 left-3 border-b border-l',
            'bottom-3 right-3 border-b border-r',
          ].map((cls, i) => (
            <div key={i} className={`absolute ${cls} w-5 h-5`} style={{ borderColor: 'rgba(201,168,76,0.28)', borderWidth: 1 }} />
          ))}

          {/* Crest */}
          <HotelCrest />

          {/* Hotel name */}
          <h1 className="auth-up-2 font-heading text-[26px] font-bold text-[#F8F0E8] tracking-[0.05em] mt-4 mb-1">
            My Stay
          </h1>
          <div className="auth-up-3 flex items-center gap-2">
            <div className="h-px w-5" style={{ background: 'rgba(201,168,76,0.45)' }} />
            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#C9A84C]">
              Premier Guest Experience
            </p>
            <div className="h-px w-5" style={{ background: 'rgba(201,168,76,0.45)' }} />
          </div>
        </div>

        {/* ▓ White form section */}
        <div className="bg-white px-8 pb-8 rounded-b-3xl">
          <OrnamentalDivider />

          <p className="auth-up-3 text-[10px] font-bold uppercase tracking-[0.25em] text-[#C9A84C] text-center mb-7">
            {t('loginTitle')}
          </p>

          {serverError && (
            <div className="auth-up-3 mb-5 bg-red-50 text-red-800 rounded-xl px-4 py-3 text-xs leading-relaxed">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="auth-up-3">
              <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#7A8BA8] mb-2">
                {t('email')}
              </label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder="guest@example.com"
                className="auth-input w-full rounded-xl border bg-[#FAFAFA] px-4 py-3 text-sm text-[#1B2D5B] placeholder:text-[rgba(27,45,91,0.22)]"
                style={{ borderColor: 'rgba(27,45,91,0.10)' }}
              />
              {errors.email && <p className="mt-1.5 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div className="auth-up-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#7A8BA8]">
                  {t('password')}
                </label>
                <Link href={`/${locale}/forgot-password`}
                  className="text-[11px] font-semibold text-[#C9A84C] hover:text-[#1B2D5B] transition-colors"
                >
                  {t('forgotPassword')}
                </Link>
              </div>
              <input
                {...register('password')}
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="auth-input w-full rounded-xl border bg-[#FAFAFA] px-4 py-3 text-sm text-[#1B2D5B] placeholder:text-[rgba(27,45,91,0.22)]"
                style={{ borderColor: 'rgba(27,45,91,0.10)' }}
              />
              {errors.password && <p className="mt-1.5 text-xs text-red-500">{errors.password.message}</p>}
            </div>

            <div className="auth-up-5 pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="auth-btn w-full rounded-xl py-3.5 text-sm font-bold tracking-wide text-[#F8F0E8] disabled:opacity-60 min-h-[50px]"
                style={{ background: '#1B2D5B' }}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="7" />
                    </svg>
                    {/* TODO: i18n */}
                    Signing in…
                  </span>
                ) : t('login')}
              </button>
            </div>
          </form>

          {/* Footer link */}
          <div className="auth-up-6 mt-7 flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'rgba(27,45,91,0.07)' }} />
            <p className="text-[11px] text-[#7A8BA8]">
              {t('noAccount')}{' '}
              <Link href={`/${locale}/signup`}
                className="font-bold text-[#C9A84C] hover:text-[#1B2D5B] transition-colors"
              >
                {t('signup')}
              </Link>
            </p>
            <div className="flex-1 h-px" style={{ background: 'rgba(27,45,91,0.07)' }} />
          </div>

          {/* ── Test accounts ── */}
          <div className="auth-up-6 mt-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 h-px" style={{ background: 'rgba(27,45,91,0.07)' }} />
                <div className="flex items-center gap-1.5">
                  <span
                    className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-[0.2em] leading-none"
                    style={{ background: 'rgba(201,168,76,0.12)', color: '#C9A84C', border: '0.5px solid rgba(201,168,76,0.3)' }}
                  >
                    DEV
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(27,45,91,0.35)' }}>
                    Test Accounts
                  </span>
                </div>
                <div className="flex-1 h-px" style={{ background: 'rgba(27,45,91,0.07)' }} />
              </div>

              <div className="grid grid-cols-3 gap-2" ref={gridRef}>
                {TEST_ACCOUNTS.map(({ role, email, password, icon, tagline, capabilities }, idx) => {
                  const isHovered = hoveredRole === role
                  const isTapped = tappedRole === role
                  const isVisible = isHovered || isTapped
                  const isLeft = idx === 0
                  const isRight = idx === TEST_ACCOUNTS.length - 1
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => {
                        if (isHovered || isTapped) {
                          loginAsTestAccount(email, password)
                        } else {
                          setTappedRole(role)
                        }
                      }}
                      disabled={isSubmitting}
                      onMouseEnter={() => setHoveredRole(role)}
                      onMouseLeave={() => setHoveredRole(null)}
                      className="test-account-btn relative flex flex-col items-center gap-1.5 rounded-xl py-3 px-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: isVisible ? 'rgba(27,45,91,0.08)' : 'rgba(27,45,91,0.04)',
                        border: `1px solid ${isVisible ? 'rgba(201,168,76,0.35)' : 'rgba(27,45,91,0.08)'}`,
                        transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
                      }}
                    >
                      <span
                        className="flex items-center justify-center rounded-full text-[15px] leading-none"
                        style={{
                          width: 32, height: 32,
                          background: isVisible ? 'rgba(201,168,76,0.16)' : 'rgba(201,168,76,0.08)',
                          border: `1px solid ${isVisible ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.2)'}`,
                          color: '#C9A84C',
                          transition: 'background 0.2s, border-color 0.2s',
                        }}
                      >
                        {icon}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: '#1B2D5B' }}>
                        {role}
                      </span>

                      {/* Floating speech-bubble tooltip */}
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 'calc(100% + 12px)',
                          left: isLeft ? '-8px' : isRight ? 'auto' : '50%',
                          right: isRight ? '-8px' : 'auto',
                          transform: isLeft || isRight
                            ? (isVisible ? 'translateY(0)' : 'translateY(6px)')
                            : (isVisible ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(6px)'),
                          width: 200,
                          zIndex: 50,
                          opacity: isVisible ? 1 : 0,
                          transition: 'opacity 0.18s ease, transform 0.2s cubic-bezier(0.16,1,0.3,1)',
                          pointerEvents: 'none',
                        }}
                      >
                        {/* Bubble body */}
                        <div
                          className="rounded-2xl px-4 py-3.5"
                          style={{
                            background: 'linear-gradient(145deg, #1E3366 0%, #1B2D5B 100%)',
                            border: '1px solid rgba(201,168,76,0.3)',
                            boxShadow: '0 12px 32px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(201,168,76,0.08)',
                          }}
                        >
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-3" style={{ color: '#C9A84C' }}>
                            {tagline}
                          </p>
                          <ul className="space-y-2">
                            {capabilities.map((cap) => (
                              <li key={cap} className="flex items-start gap-2">
                                <svg width="5" height="5" viewBox="0 0 4 4" fill="#C9A84C" className="mt-0.75 shrink-0" opacity="0.7">
                                  <path d="M2 0L4 2L2 4L0 2Z" />
                                </svg>
                                <span className="text-[11px] leading-snug text-left font-medium" style={{ color: 'rgba(248,240,232,0.9)' }}>
                                  {cap}
                                </span>
                              </li>
                            ))}
                          </ul>
                          {isTapped && (
                            <p className="md:hidden mt-3 pt-2.5 text-[10px] font-bold text-center tracking-wide" style={{ color: 'rgba(201,168,76,0.8)', borderTop: '1px solid rgba(201,168,76,0.15)' }}>
                              Tap again to sign in →
                            </p>
                          )}
                        </div>

                        {/* Arrow tail */}
                        <div
                          style={{
                            position: 'absolute',
                            bottom: -5,
                            left: isLeft ? 24 : isRight ? 'auto' : '50%',
                            right: isRight ? 24 : 'auto',
                            transform: (isLeft || isRight) ? 'rotate(45deg)' : 'translateX(-50%) rotate(45deg)',
                            width: 9,
                            height: 9,
                            background: '#1B2D5B',
                            borderRight: '1px solid rgba(201,168,76,0.3)',
                            borderBottom: '1px solid rgba(201,168,76,0.3)',
                          }}
                        />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
      </div>

      {/* Sub-card tagline */}
      <p className="auth-up-6 mt-4 text-center text-[9px] font-semibold uppercase tracking-[0.3em]"
        style={{ color: 'rgba(27,45,91,0.3)' }}
      >
        Secure · Private · Exceptional
      </p>
    </div>
  )
}
