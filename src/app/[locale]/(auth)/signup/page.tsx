'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v4'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { signupAction } from '@/lib/actions/auth'

const signupSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8)
    .regex(/[A-Z]/, 'Must include an uppercase letter')
    .regex(/[0-9]/, 'Must include a number'),
  phone: z.string().optional(),
  language: z.enum(['en', 'fr', 'ar']),
  hotelSlug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, hyphens'),
  terms: z.boolean().refine(v => v === true, 'You must accept the terms'),
})

type SignupForm = z.infer<typeof signupSchema>

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null
  const checks = [password.length >= 8, /[A-Z]/.test(password), /[0-9]/.test(password), /[^A-Za-z0-9]/.test(password)]
  const score = checks.filter(Boolean).length
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e']
  const labels = ['Weak', 'Fair', 'Good', 'Strong']
  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-[3px] flex-1 rounded-full transition-all duration-300"
            style={{ background: i < score ? colors[score - 1] : 'rgba(27,45,91,0.08)' }}
          />
        ))}
      </div>
      <p className="text-[10px]" style={{ color: score > 0 ? colors[score - 1] : '#7A8BA8' }}>
        {score > 0 ? labels[score - 1] : ''}
      </p>
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#7A8BA8] mb-2">
      {children}
    </label>
  )
}

const inputCls = 'auth-input w-full rounded-xl border bg-[#FAFAFA] px-4 py-3 text-sm text-[#1B2D5B] placeholder:text-[rgba(27,45,91,0.22)]'
const inputStyle = { borderColor: 'rgba(27,45,91,0.10)' }

export default function SignupPage() {
  const router = useRouter()
  const params = useParams()
  const locale = (params.locale as string) || 'en'
  const [serverError, setServerError] = useState<string | null>(null)
  const [password, setPassword] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: { language: (locale as 'en' | 'fr' | 'ar') || 'en' },
  })

  async function onSubmit(data: SignupForm) {
    setServerError(null)
    const result = await signupAction({
      email: data.email, password: data.password,
      fullName: data.fullName, phone: data.phone,
      language: data.language, hotelSlug: data.hotelSlug,
    })
    if (result.error) { setServerError(result.error); return }
    router.push(`/${locale}/dashboard`)
  }

  return (
    <div className="auth-card">
      <div
        className="rounded-3xl overflow-hidden"
        style={{ boxShadow: '0 16px 56px rgba(27,45,91,0.18), 0 2px 8px rgba(27,45,91,0.08)' }}
      >
        {/* ▓ Navy header */}
        <div className="relative px-8 pt-8 pb-7 flex flex-col items-center overflow-hidden" style={{ background: '#1B2D5B' }}>
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(201,168,76,0.10) 0%, transparent 70%)',
          }} />
          {[
            'top-3 left-3 border-t border-l', 'top-3 right-3 border-t border-r',
            'bottom-3 left-3 border-b border-l', 'bottom-3 right-3 border-b border-r',
          ].map((cls, i) => (
            <div key={i} className={`absolute ${cls} w-5 h-5`} style={{ borderColor: 'rgba(201,168,76,0.28)', borderWidth: 1 }} />
          ))}

          <div className="auth-up-1 relative flex items-center justify-center" style={{ width: 64, height: 64 }}>
            <svg className="crest-ring-outer absolute inset-0" width="64" height="64" viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="29" stroke="#C9A84C" strokeWidth="0.75" strokeDasharray="4 6" strokeOpacity="0.5" />
            </svg>
            <div className="relative flex items-center justify-center rounded-full"
              style={{ width: 44, height: 44, background: 'rgba(201,168,76,0.1)', border: '1.5px solid #C9A84C' }}>
              <span className="font-heading text-lg font-bold text-[#C9A84C] leading-none select-none">MS</span>
            </div>
            {[{ top: '-3px', left: '50%', transform: 'translateX(-50%)' },{ bottom: '-3px', left: '50%', transform: 'translateX(-50%)' },{ left: '-3px', top: '50%', transform: 'translateY(-50%)' },{ right: '-3px', top: '50%', transform: 'translateY(-50%)' }].map((s, i) => (
              <div key={i} className="absolute" style={{ ...s, width: 5, height: 5, background: '#C9A84C', transform: `${s.transform} rotate(45deg)` }} />
            ))}
          </div>

          <h1 className="auth-up-2 font-heading text-[22px] font-bold text-[#F8F0E8] tracking-[0.05em] mt-3">My Stay</h1>
          <div className="auth-up-3 flex items-center gap-2 mt-1">
            <div className="h-px w-4" style={{ background: 'rgba(201,168,76,0.45)' }} />
            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#C9A84C]">Create Your Account</p>
            <div className="h-px w-4" style={{ background: 'rgba(201,168,76,0.45)' }} />
          </div>
        </div>

        {/* ▓ White form */}
        <div className="bg-white px-7 pb-7">
          <div className="flex items-center gap-2 my-5">
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.5))' }} />
            <svg width="7" height="7" viewBox="0 0 8 8" fill="#C9A84C" opacity="0.8"><path d="M4 0L8 4L4 8L0 4Z"/></svg>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, rgba(201,168,76,0.5))' }} />
          </div>

          {serverError && (
            <div className="auth-up-3 mb-4 bg-red-50 text-red-800 rounded-xl px-4 py-3 text-xs leading-relaxed">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="auth-up-3">
              <FieldLabel>Full Name</FieldLabel>
              <input {...register('fullName')} type="text" autoComplete="name" placeholder="Jean Dupont"
                className={inputCls} style={inputStyle} />
              {errors.fullName && <p className="mt-1 text-xs text-red-500">{errors.fullName.message}</p>}
            </div>

            <div className="auth-up-3">
              <FieldLabel>Email</FieldLabel>
              <input {...register('email')} type="email" autoComplete="email" placeholder="guest@example.com"
                className={inputCls} style={inputStyle} />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div className="auth-up-4">
              <FieldLabel>Password</FieldLabel>
              <input
                {...register('password', { onChange: e => setPassword(e.target.value) })}
                type="password" autoComplete="new-password" placeholder="••••••••"
                className={inputCls} style={inputStyle}
              />
              <PasswordStrength password={password} />
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>

            {/* Row: phone + language */}
            <div className="auth-up-4 grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Phone <span className="normal-case font-normal tracking-normal opacity-60">(opt)</span></FieldLabel>
                <input {...register('phone')} type="tel" placeholder="+33 6…"
                  className={inputCls} style={inputStyle} />
              </div>
              <div>
                <FieldLabel>Language</FieldLabel>
                <select {...register('language')}
                  className={`${inputCls} cursor-pointer`} style={inputStyle}
                >
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                  <option value="ar">العربية</option>
                </select>
              </div>
            </div>

            <div className="auth-up-5">
              <FieldLabel>Hotel Code</FieldLabel>
              <input {...register('hotelSlug')} type="text" placeholder="le-grand-hotel"
                className={`${inputCls} font-mono`} style={inputStyle} />
              <p className="mt-1.5 text-[10px] text-[#7A8BA8]">
                The unique code for your property — provided at check-in
              </p>
              {errors.hotelSlug && <p className="mt-1 text-xs text-red-500">{errors.hotelSlug.message}</p>}
            </div>

            <div className="auth-up-5 flex items-start gap-3 pt-1">
              <div className="mt-0.5 relative flex-shrink-0">
                <input {...register('terms')} type="checkbox" id="terms"
                  className="peer w-4 h-4 rounded cursor-pointer accent-[#1B2D5B]" />
              </div>
              <label htmlFor="terms" className="text-[11px] text-[#7A8BA8] leading-relaxed cursor-pointer">
                I agree to the{' '}
                <span className="text-[#C9A84C] hover:underline cursor-pointer">Terms of Service</span>
                {' '}and{' '}
                <span className="text-[#C9A84C] hover:underline cursor-pointer">Privacy Policy</span>
              </label>
            </div>
            {errors.terms && <p className="-mt-2 text-xs text-red-500">{errors.terms.message}</p>}

            <div className="auth-up-6 pt-1">
              <button type="submit" disabled={isSubmitting}
                className="auth-btn w-full rounded-xl py-3.5 text-sm font-bold tracking-wide text-[#F8F0E8] disabled:opacity-60 min-h-12"
                style={{ background: '#1B2D5B' }}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="7" />
                    </svg>
                    Creating account…
                  </span>
                ) : 'Create My Account'}
              </button>
            </div>
          </form>

          <div className="auth-up-6 mt-6 flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'rgba(27,45,91,0.07)' }} />
            <p className="text-[11px] text-[#7A8BA8]">
              Have an account?{' '}
              <Link href={`/${locale}/login`} className="font-bold text-[#C9A84C] hover:text-[#1B2D5B] transition-colors">
                Sign in
              </Link>
            </p>
            <div className="flex-1 h-px" style={{ background: 'rgba(27,45,91,0.07)' }} />
          </div>
        </div>
      </div>

      <p className="auth-up-6 mt-4 text-center text-[9px] font-semibold uppercase tracking-[0.3em]"
        style={{ color: 'rgba(27,45,91,0.3)' }}>
        Secure · Private · Exceptional
      </p>
    </div>
  )
}
