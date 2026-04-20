import { StaffSidebarNav } from './_components/sidebar-nav'
import { PushPermissionPrompt } from '@/components/shared/push-permission-prompt'

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: '#F8F0E8' }}>
      <StaffSidebarNav />
      <main className="flex-1 overflow-auto">
        <PushPermissionPrompt />
        {children}
      </main>
    </div>
  )
}
