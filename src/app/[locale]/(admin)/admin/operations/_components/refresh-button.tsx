'use client'

import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { useState } from 'react'

export function RefreshButton() {
  const router = useRouter()
  const [spinning, setSpinning] = useState(false)

  function handleRefresh() {
    setSpinning(true)
    router.refresh()
    setTimeout(() => setSpinning(false), 800)
  }

  return (
    <button
      onClick={handleRefresh}
      className="flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all hover:bg-[rgba(27,45,91,0.12)] hover:opacity-80 active:scale-95"
      style={{ background: 'rgba(27,45,91,0.07)', color: '#1B2D5B' }}
    >
      <RefreshCw
        className="size-4"
        style={{
          animation: spinning ? 'spin 0.8s linear infinite' : 'none',
        }}
      />
      Refresh
    </button>
  )
}
