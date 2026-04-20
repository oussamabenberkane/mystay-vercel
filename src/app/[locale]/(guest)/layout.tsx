import { BottomNav } from './_components/bottom-nav'

export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen" style={{ background: '#F8F0E8' }}>
      <main className="pb-20">{children}</main>
      <BottomNav />
    </div>
  )
}
