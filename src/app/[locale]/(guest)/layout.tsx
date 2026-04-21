import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { defaultLocale } from '@/lib/i18n/config'
import { BottomNav } from './_components/bottom-nav'
import { PushPermissionPrompt } from '@/components/shared/push-permission-prompt'

export default async function GuestLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale ?? defaultLocale}/login`)

  const { data: profileData } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const profile = profileData as { role: string } | null
  if (!profile || profile.role !== 'client') {
    redirect(`/${locale ?? defaultLocale}/login`)
  }

  return (
    <div className="relative min-h-screen" style={{ background: '#F8F0E8' }}>
      <PushPermissionPrompt />
      <main className="pb-20">{children}</main>
      <BottomNav />
    </div>
  )
}
