'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v4'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { loginAction } from '@/lib/actions/auth'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
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

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

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
        className="rounded-3xl overflow-hidden"
        style={{ boxShadow: '0 16px 56px rgba(27,45,91,0.18), 0 2px 8px rgba(27,45,91,0.08), inset 0 1px 0 rgba(255,255,255,0.06)' }}
      >

        {/* ▓ Navy header vault */}
        <div
          className="relative px-8 pt-9 pb-8 flex flex-col items-center overflow-hidden"
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
        <div className="bg-white px-8 pb-8">
          <OrnamentalDivider />

          <p className="auth-up-3 text-[10px] font-bold uppercase tracking-[0.25em] text-[#C9A84C] text-center mb-7">
            Welcome Back
          </p>

          {serverError && (
            <div className="auth-up-3 mb-5 bg-red-50 text-red-800 rounded-xl px-4 py-3 text-xs leading-relaxed">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="auth-up-3">
              <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#7A8BA8] mb-2">
                Email Address
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
                  Password
                </label>
                <Link href={`/${locale}/forgot-password`}
                  className="text-[11px] font-semibold text-[#C9A84C] hover:text-[#1B2D5B] transition-colors"
                >
                  Forgot?
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
                    Signing in…
                  </span>
                ) : 'Sign In to My Stay'}
              </button>
            </div>
          </form>

          {/* Footer link */}
          <div className="auth-up-6 mt-7 flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'rgba(27,45,91,0.07)' }} />
            <p className="text-[11px] text-[#7A8BA8]">
              New guest?{' '}
              <Link href={`/${locale}/signup`}
                className="font-bold text-[#C9A84C] hover:text-[#1B2D5B] transition-colors"
              >
                Create account
              </Link>
            </p>
            <div className="flex-1 h-px" style={{ background: 'rgba(27,45,91,0.07)' }} />
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
