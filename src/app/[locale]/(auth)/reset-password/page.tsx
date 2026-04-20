'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v4'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { updatePasswordAction } from '@/lib/actions/auth'

const schema = z.object({
  password: z.string().min(8)
    .regex(/[A-Z]/, 'Must include an uppercase letter')
    .regex(/[0-9]/, 'Must include a number'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof schema>

export default function ResetPasswordPage() {
  const router = useRouter()
  const params = useParams()
  const locale = (params.locale as string) || 'en'
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setServerError(null)
    const result = await updatePasswordAction({ password: data.password })
    if (result.error) { setServerError(result.error); return }
    router.push(`/${locale}/login?reset=success`)
  }

  return (
    <div className="auth-card">
      <div
        className="rounded-3xl overflow-hidden"
        style={{ boxShadow: '0 16px 56px rgba(27,45,91,0.18), 0 2px 8px rgba(27,45,91,0.08)' }}
      >
        {/* ▓ Navy header */}
        <div className="relative px-8 pt-9 pb-8 flex flex-col items-center overflow-hidden" style={{ background: '#1B2D5B' }}>
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(201,168,76,0.10) 0%, transparent 70%)',
          }} />
          {['top-3 left-3 border-t border-l','top-3 right-3 border-t border-r','bottom-3 left-3 border-b border-l','bottom-3 right-3 border-b border-r'].map((cls, i) => (
            <div key={i} className={`absolute ${cls} w-5 h-5`} style={{ borderColor: 'rgba(201,168,76,0.28)', borderWidth: 1 }} />
          ))}

          <div className="auth-up-1 relative flex items-center justify-center" style={{ width: 72, height: 72 }}>
            <svg className="crest-ring-outer absolute inset-0" width="72" height="72" viewBox="0 0 72 72" fill="none">
              <circle cx="36" cy="36" r="33" stroke="#C9A84C" strokeWidth="0.75" strokeDasharray="4 6" strokeOpacity="0.5"/>
            </svg>
            <div className="relative flex items-center justify-center rounded-full"
              style={{ width: 48, height: 48, background: 'rgba(201,168,76,0.1)', border: '1.5px solid #C9A84C' }}>
              <span className="font-heading text-xl font-bold text-[#C9A84C] leading-none select-none">MS</span>
            </div>
            {[{top:'-3px',left:'50%',transform:'translateX(-50%)'},{bottom:'-3px',left:'50%',transform:'translateX(-50%)'},{left:'-3px',top:'50%',transform:'translateY(-50%)'},{right:'-3px',top:'50%',transform:'translateY(-50%)'}].map((s,i)=>(
              <div key={i} className="absolute" style={{...s,width:5,height:5,background:'#C9A84C',transform:`${s.transform} rotate(45deg)`}}/>
            ))}
          </div>

          <h1 className="auth-up-2 font-heading text-[24px] font-bold text-[#F8F0E8] tracking-[0.05em] mt-4">My Stay</h1>
          <div className="auth-up-3 flex items-center gap-2 mt-1.5">
            <div className="h-px w-4" style={{ background: 'rgba(201,168,76,0.45)' }} />
            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#C9A84C]">Set New Password</p>
            <div className="h-px w-4" style={{ background: 'rgba(201,168,76,0.45)' }} />
          </div>
        </div>

        {/* ▓ White body */}
        <div className="bg-white px-8 pb-8">
          <div className="flex items-center gap-2 my-6">
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.5))' }} />
            <svg width="7" height="7" viewBox="0 0 8 8" fill="#C9A84C" opacity="0.8"><path d="M4 0L8 4L4 8L0 4Z"/></svg>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, rgba(201,168,76,0.5))' }} />
          </div>

          <p className="auth-up-3 text-[10px] font-bold uppercase tracking-[0.25em] text-[#C9A84C] text-center mb-7">
            New Password
          </p>

          {serverError && (
            <div className="auth-up-3 mb-4 bg-red-50 text-red-800 rounded-xl px-4 py-3 text-xs">{serverError}</div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="auth-up-3">
              <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#7A8BA8] mb-2">
                New Password
              </label>
              <input
                {...register('password')}
                type="password" autoComplete="new-password" placeholder="••••••••"
                className="auth-input w-full rounded-xl border bg-[#FAFAFA] px-4 py-3 text-sm text-[#1B2D5B] placeholder:text-[rgba(27,45,91,0.22)]"
                style={{ borderColor: 'rgba(27,45,91,0.10)' }}
              />
              {errors.password && <p className="mt-1.5 text-xs text-red-500">{errors.password.message}</p>}
            </div>

            <div className="auth-up-4">
              <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#7A8BA8] mb-2">
                Confirm Password
              </label>
              <input
                {...register('confirmPassword')}
                type="password" autoComplete="new-password" placeholder="••••••••"
                className="auth-input w-full rounded-xl border bg-[#FAFAFA] px-4 py-3 text-sm text-[#1B2D5B] placeholder:text-[rgba(27,45,91,0.22)]"
                style={{ borderColor: 'rgba(27,45,91,0.10)' }}
              />
              {errors.confirmPassword && <p className="mt-1.5 text-xs text-red-500">{errors.confirmPassword.message}</p>}
            </div>

            <div className="auth-up-5 pt-1">
              <button type="submit" disabled={isSubmitting}
                className="auth-btn w-full rounded-xl py-3.5 text-sm font-bold tracking-wide text-[#F8F0E8] disabled:opacity-60 min-h-12"
                style={{ background: '#1B2D5B' }}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="7"/>
                    </svg>
                    Updating…
                  </span>
                ) : 'Update Password'}
              </button>
            </div>
          </form>

          <div className="auth-up-6 mt-6 text-center">
            <Link href={`/${locale}/login`}
              className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#C9A84C] hover:text-[#1B2D5B] transition-colors">
              ← Back to Sign In
            </Link>
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
