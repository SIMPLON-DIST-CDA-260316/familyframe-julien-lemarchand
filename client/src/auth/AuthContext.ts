import { createContext, useContext } from 'react'
import type { LoginResult } from '@/auth/authApi.ts'
import type { PublicUser } from '@/auth/user.ts'

export type AuthContextValue = {
  user: PublicUser | null
  // True until /api/auth/me answers: the cookie is httpOnly, only the API knows the user.
  isLoading: boolean
  login: (email: string, password: string) => Promise<LoginResult>
  logout: () => Promise<void>
  // For a 401 from the API: the session ended on the server.
  dropUser: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (value === null) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
