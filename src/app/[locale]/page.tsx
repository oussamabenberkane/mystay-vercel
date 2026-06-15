import { getTranslations } from 'next-intl/server'
import { SplashClient } from './_components/splash-client'
import { SPLASH_DELAY_MS } from '@/lib/config/splash'

/**
 * Locale root = pre-auth SPLASH.
 *
 * Middleware redirects authenticated users away from `/` to their role home,
 * so only unauthenticated visitors reach this. The splash shows the "My Stay"
 * mark for SPLASH_DELAY_MS, then auto-advances to `/{locale}/landing`.
 *
 * A <meta http-equiv="refresh"> is included as a no-JS fallback so the visitor
 * still reaches the landing page even if the client script never runs.
 */
export default async function LocaleIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('landing')
  const refreshSeconds = Math.ceil(SPLASH_DELAY_MS / 1000)

  return (
    <>
      <meta httpEquiv="refresh" content={`${refreshSeconds};url=/${locale}/landing`} />
      <SplashClient locale={locale} kicker={t('splash.kicker')} skipLabel={t('splash.skip')} />
    </>
  )
}
