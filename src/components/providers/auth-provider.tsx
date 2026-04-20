'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/store/auth-store'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setProfile = useAuthStore(state => state.setProfile)

  useEffect(() => {
    const supabase = createClient()

    async function loadProfile(userId: string) {
      const { data } = await supabase
        .from('profiles')
        .select('id, hotel_id, role, full_name, phone, language')
        .eq('id', userId)
        .single()

      if (data) {
        setProfile(data)
      }
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) loadProfile(user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [setProfile])

  return <>{children}</>
}
