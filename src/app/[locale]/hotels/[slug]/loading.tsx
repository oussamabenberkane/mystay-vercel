/**
 * Detail skeleton shown while /hotels/[slug] server-fetches. Pure shapes, so
 * it's locale- and direction-agnostic. Mirrors the gallery + title + content/
 * aside layout of the real page.
 */
export default function HotelDetailLoading() {
  return (
    <div className="min-h-screen" style={{ background: '#F8F0E8' }}>
      <div className="h-14" style={{ background: '#1B2D5B' }} />

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="h-3 w-24 rounded-full" style={{ background: 'rgba(27,45,91,0.1)' }} />

        {/* gallery */}
        <div className="mt-4 animate-pulse">
          <div className="aspect-[16/10] w-full rounded-3xl" style={{ background: 'rgba(27,45,91,0.1)' }} />
          <div className="mt-3 flex gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] w-24 rounded-xl sm:w-28" style={{ background: 'rgba(27,45,91,0.08)' }} />
            ))}
          </div>
        </div>

        {/* title */}
        <div className="mt-6 h-9 w-2/3 max-w-md animate-pulse rounded-xl" style={{ background: 'rgba(27,45,91,0.1)' }} />

        {/* content + aside */}
        <div className="mt-8 grid animate-pulse gap-8 lg:grid-cols-[1.7fr_1fr]">
          <div className="space-y-4">
            <div className="h-5 w-40 rounded-md" style={{ background: 'rgba(27,45,91,0.1)' }} />
            <div className="h-3.5 w-full rounded-md" style={{ background: 'rgba(27,45,91,0.06)' }} />
            <div className="h-3.5 w-11/12 rounded-md" style={{ background: 'rgba(27,45,91,0.06)' }} />
            <div className="h-3.5 w-4/5 rounded-md" style={{ background: 'rgba(27,45,91,0.06)' }} />
            <div className="grid grid-cols-2 gap-3 pt-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-14 rounded-xl" style={{ background: 'rgba(27,45,91,0.06)' }} />
              ))}
            </div>
          </div>
          <div className="h-72 rounded-3xl" style={{ background: 'rgba(27,45,91,0.12)' }} />
        </div>
      </main>
    </div>
  )
}
