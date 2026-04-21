'use client'

import { LogOut } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

export function GuestSignOutButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const t = useTranslations('auth')

  async function handleSignOut() {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/en/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-opacity hover:opacity-70 disabled:opacity-50"
      style={{ color: 'rgba(248,240,232,0.7)', background: 'rgba(255,255,255,0.08)' }}
    >
      <LogOut className="size-3.5" />
      {loading ? '…' : t('logout')}
    </button>
  )
}
