import { type JSX, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from '@/auth/AuthContext.ts'
import { fetchCurrentUser, type LoginResult, postLogin, postLogout } from '@/auth/authApi.ts'
import type { PublicUser } from '@/auth/user.ts'

// A frame powered back on can boot before the Wi-Fi or the API: ask again instead of showing /login.
const RETRY_DELAY_MS = 5000

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<PublicUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    let isCancelled = false

    async function checkSession(): Promise<void> {
      const result = await fetchCurrentUser()
      if (isCancelled) return
      if (result.status === 'unreachable') {
        retryTimer = setTimeout(checkSession, RETRY_DELAY_MS)
        return
      }
      setUser(result.status === 'authenticated' ? result.user : null)
      setIsLoading(false)
    }

    checkSession()
    return () => {
      isCancelled = true
      clearTimeout(retryTimer)
    }
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
