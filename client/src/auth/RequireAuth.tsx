import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from '@/auth/AuthContext.ts'

export function RequireAuth({ children }: { children: ReactNode }): ReactNode {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  // Redirecting before /api/auth/me answers (or while it is unreachable) would send a logged-in user to /login on reload.
  if (isLoading) return null
  if (user === null) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return children
}
