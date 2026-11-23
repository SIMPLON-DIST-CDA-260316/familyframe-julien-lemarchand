import { type JSX, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from '@/auth/AuthContext.ts'
import { fetchCurrentUser, type LoginResult, postLogin, postLogout } from '@/auth/authApi.ts'
import type { PublicUser } from '@/auth/user.ts'

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<PublicUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchCurrentUser().then((currentUser) => {
      setUser(currentUser)
      setIsLoading(false)
    })
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    const result = await postLogin(email, password)
    if (result.isSuccess) setUser(result.user)
    return result
  }, [])

  const logout = useCallback(async (): Promise<void> => {
    await postLogout()
    setUser(null)
  }, [])

  const dropUser = useCallback((): void => setUser(null), [])

  const value = useMemo(
    () => ({ user, isLoading, login, logout, dropUser }),
    [user, isLoading, login, logout, dropUser],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
