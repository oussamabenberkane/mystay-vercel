import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { locales } from '@/lib/i18n/config'
import { AuthProvider } from '@/components/providers/auth-provider'

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!locales.includes(locale as any)) notFound()

  const messages = await getMessages()
  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  return (
    <div lang={locale} dir={dir} className="min-h-screen">
      <NextIntlClientProvider messages={messages}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </NextIntlClientProvider>
    </div>
  )
}
