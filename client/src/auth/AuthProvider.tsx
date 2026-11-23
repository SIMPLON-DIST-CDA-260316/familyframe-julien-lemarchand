import { type JSX, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from '@/auth/AuthContext.ts'
import { fetchCurrentUser, type LoginResult, postLogin, postLogout } from '@/auth/authApi.ts'
import type { PublicUser } from '@/auth/user.ts'

// A frame powered back on can boot before the Wi-Fi or the API: ask again instead of showing /login.
const RETRY_DELAY_MS = 5000

// Returns the cleanup that cancels the pending check and retry.
function startSessionCheck(onAnswer: (user: PublicUser | null) => void): () => void {
  let retryTimer: ReturnType<typeof setTimeout> | undefined
  let isCancelled = false

  async function checkSession(): Promise<void> {
    const result = await fetchCurrentUser()
    if (isCancelled) return
    if (result.status === 'unreachable') {
      retryTimer = setTimeout(checkSession, RETRY_DELAY_MS)
      return
    }
    onAnswer(result.status === 'authenticated' ? result.user : null)
  }

  checkSession()
  return () => {
    isCancelled = true
    clearTimeout(retryTimer)
  }
}

function useSessionState(): {
  user: PublicUser | null
  setUser: (user: PublicUser | null) => void
  isLoading: boolean
} {
  const [user, setUser] = useState<PublicUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // isLoading drops only with a definitive answer: an unreachable API keeps the frame waiting.
  useEffect(
    () =>
      startSessionCheck((currentUser) => {
        setUser(currentUser)
        setIsLoading(false)
      }),
    [],
  )

  return { user, setUser, isLoading }
}

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const { user, setUser, isLoading } = useSessionState()

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      const result = await postLogin(email, password)
      if (result.isSuccess) setUser(result.user)
      return result
    },
    [setUser],
  )

  const logout = useCallback(async (): Promise<void> => {
    await postLogout()
    setUser(null)
  }, [setUser])

  const dropUser = useCallback((): void => setUser(null), [setUser])

  const value = useMemo(
    () => ({ user, isLoading, login, logout, dropUser }),
    [user, isLoading, login, logout, dropUser],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
