import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { defaultLocale } from '@/lib/i18n/config'
import { StaffSidebarNav } from './_components/sidebar-nav'
import { PushPermissionPrompt } from '@/components/shared/push-permission-prompt'

export default async function StaffLayout({
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
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  const profile = profileData as { role: string; full_name: string } | null
  if (!profile || profile.role !== 'staff') {
    redirect(`/${locale ?? defaultLocale}/login`)
  }

  return (
    <div className="flex min-h-screen" style={{ background: '#F8F0E8' }}>
      <StaffSidebarNav staffName={profile.full_name} />
      <main className="flex-1 overflow-auto">
        <PushPermissionPrompt />
        {children}
      </main>
    </div>
  )
}
