import { StaffSidebarNav } from './_components/sidebar-nav'

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: '#F8F0E8' }}>
      <StaffSidebarNav />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
