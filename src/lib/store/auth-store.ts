import { create } from 'zustand'

type Profile = {
  id: string
  hotel_id: string
  role: 'client' | 'staff' | 'admin'
  full_name: string
  phone: string | null
  language: string
}

type AuthStore = {
  profile: Profile | null
  setProfile: (profile: Profile | null) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
}))
