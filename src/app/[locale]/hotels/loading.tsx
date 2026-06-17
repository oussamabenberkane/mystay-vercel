/**
 * Listing skeleton shown while /hotels server-fetches. Pure shapes (no copy) so
 * it's locale- and direction-agnostic. Mirrors the hero + floating filter card
 * + 3-column grid of the real page to avoid layout shift on load.
 */
export default function HotelsLoading() {
  return (
    <div className="min-h-screen" style={{ background: '#F8F0E8' }}>
      {/* header bar */}
      <div className="h-14" style={{ background: '#1B2D5B' }} />

      {/* hero band */}
      <section
        className="relative"
        style={{ background: 'linear-gradient(155deg, #24386B 0%, #1B2D5B 52%, #14223F 100%)' }}
      >
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 pt-14 pb-32">
          <div className="h-3 w-28 rounded-full" style={{ background: 'rgba(201,168,76,0.35)' }} />
          <div className="h-9 w-3/4 max-w-xl rounded-xl" style={{ background: 'rgba(248,240,232,0.16)' }} />
          <div className="h-4 w-1/2 max-w-md rounded-lg" style={{ background: 'rgba(248,240,232,0.1)' }} />
        </div>
      </section>

      <main className="relative z-10 mx-auto -mt-24 max-w-6xl px-4 pb-16">
        {/* filter card */}
        <div className="card-warm animate-pulse p-5" style={{ boxShadow: '0 20px 50px rgba(20,34,63,0.22)' }}>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="h-11 flex-1 rounded-xl" style={{ background: 'rgba(27,45,91,0.07)' }} />
            <div className="h-11 rounded-xl sm:w-52" style={{ background: 'rgba(27,45,91,0.07)' }} />
          </div>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <div className="h-11 rounded-xl sm:w-48" style={{ background: 'rgba(27,45,91,0.07)' }} />
            <div className="h-11 rounded-xl sm:w-44" style={{ background: 'rgba(27,45,91,0.07)' }} />
            <div className="h-11 flex-1 rounded-xl" style={{ background: 'rgba(27,45,91,0.07)' }} />
          </div>
        </div>

        {/* card grid */}
        <div className="mt-9 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card-warm animate-pulse overflow-hidden">
              <div className="aspect-[4/3] w-full" style={{ background: 'rgba(27,45,91,0.09)' }} />
              <div className="space-y-2.5 p-4">
                <div className="h-5 w-2/3 rounded-md" style={{ background: 'rgba(27,45,91,0.09)' }} />
                <div className="h-3.5 w-1/2 rounded-md" style={{ background: 'rgba(27,45,91,0.06)' }} />
                <div className="h-6 w-1/3 rounded-md" style={{ background: 'rgba(27,45,91,0.08)' }} />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
