import { BottomNav } from './_components/bottom-nav'
import { PushPermissionPrompt } from '@/components/shared/push-permission-prompt'

export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen" style={{ background: '#F8F0E8' }}>
      <PushPermissionPrompt />
      <main className="pb-20">{children}</main>
      <BottomNav />
    </div>
  )
}
