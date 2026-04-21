import Link from 'next/link'
import { locales } from '@/lib/i18n/config'

export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  const bgPattern = `url("data:image/svg+xml,%3Csvg width='44' height='44' viewBox='0 0 44 44' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M22 2L42 22L22 42L2 22Z' fill='none' stroke='rgba(201%2C168%2C76%2C0.09)' stroke-width='0.6'/%3E%3C/svg%3E")`

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ backgroundColor: '#F8F0E8', backgroundImage: bgPattern }}
    >
      {/* Ambient glow spots */}
      <div className="pointer-events-none absolute inset-0">
        <div style={{
          position: 'absolute', top: '15%', left: '10%',
          width: 400, height: 400,
          background: 'radial-gradient(circle, rgba(201,168,76,0.07) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '10%', right: '8%',
          width: 350, height: 350,
          background: 'radial-gradient(circle, rgba(27,45,91,0.05) 0%, transparent 70%)',
        }} />
      </div>

      {/* Language switcher */}
      <div className="absolute top-5 right-5 flex items-center gap-1 z-10">
        {locales.map((l) => {
          const isArabic = l === 'ar'
          const href = isArabic ? `/${locale}/login` : `/${l}/login`
          return (
            <Link
              key={l}
              href={href}
              className={`relative px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.15em] transition-all duration-200 ${
                l === locale
                  ? 'bg-[#1B2D5B] text-[#C9A84C] shadow-sm'
                  : isArabic
                  ? 'text-[rgba(27,45,91,0.25)] cursor-not-allowed'
                  : 'text-[rgba(27,45,91,0.45)] hover:text-[#1B2D5B]'
              }`}
              aria-disabled={isArabic}
              tabIndex={isArabic ? -1 : undefined}
            >
              {l}
            </Link>
          )
        })}
      </div>

      {/* Global animations for all auth pages */}
      <style>{`
        @keyframes authCardIn {
          from { opacity: 0; transform: translateY(28px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes authFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes crестSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .auth-card    { animation: authCardIn 0.65s cubic-bezier(0.16,1,0.3,1) both; }
        .auth-up-1    { animation: authFadeUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.10s both; }
        .auth-up-2    { animation: authFadeUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.18s both; }
        .auth-up-3    { animation: authFadeUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.26s both; }
        .auth-up-4    { animation: authFadeUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.34s both; }
        .auth-up-5    { animation: authFadeUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.42s both; }
        .auth-up-6    { animation: authFadeUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.50s both; }

        /* Outer deco ring slow rotation */
        .crest-ring-outer { animation: crестSpin 60s linear infinite; }

        /* Input focus glow */
        .auth-input:focus {
          outline: none;
          border-color: #C9A84C;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(201,168,76,0.12);
        }
        .auth-input { transition: border-color 0.2s, background 0.2s, box-shadow 0.2s; }

        /* Button shimmer */
        .auth-btn {
          position: relative;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .auth-btn:disabled { cursor: not-allowed; }
        .auth-btn::after {
          content: '';
          position: absolute;
          top: 0; left: -100%; width: 60%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
          transition: left 0.5s cubic-bezier(0.16,1,0.3,1);
        }
        .auth-btn:hover::after { left: 150%; }
        .auth-btn:hover { box-shadow: 0 6px 24px rgba(27,45,91,0.28); transform: translateY(-1px); }
        .auth-btn:active { transform: translateY(0); }

        /* Test account pill hover */
        .test-account-btn { cursor: pointer; }
        .test-account-btn:disabled { cursor: not-allowed; }
        .test-account-btn:hover:not(:disabled) {
          background: rgba(27,45,91,0.07) !important;
          border-color: rgba(201,168,76,0.35) !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(27,45,91,0.10);
        }
        .test-account-btn:hover:not(:disabled) span:first-child {
          background: rgba(201,168,76,0.15) !important;
          border-color: rgba(201,168,76,0.4) !important;
        }
        .test-account-btn:active:not(:disabled) { transform: translateY(0); }
      `}</style>

      <div className="w-full max-w-md px-4 py-14 z-10">
        {children}
      </div>
    </div>
  )
}
