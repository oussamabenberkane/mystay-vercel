'use client'

import { useState } from 'react'
import { logoutAction } from '@/lib/actions/auth'

interface LogoutButtonProps {
  className?: string
  children?: React.ReactNode
}

export function LogoutButton({ className, children }: LogoutButtonProps) {
  const [isPending, setIsPending] = useState(false)

  async function handleLogout() {
    setIsPending(true)
    await logoutAction()
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isPending}
      className={className}
    >
      {isPending ? 'Signing out…' : (children ?? 'Sign Out')}
    </button>
  )
}
