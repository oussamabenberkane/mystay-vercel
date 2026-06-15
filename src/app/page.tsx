import { redirect } from 'next/navigation'
import { defaultLocale } from '@/lib/i18n/config'

export default function RootPage() {
  // No-locale root → default-locale splash (which auto-advances to landing).
  redirect(`/${defaultLocale}`)
}
