export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col">
        {/* Sidebar - implemented in agent-05 */}
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
