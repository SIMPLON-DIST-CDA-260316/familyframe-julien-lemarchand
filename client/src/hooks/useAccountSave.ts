import { useState } from 'react'
import type { AccountSaveResult, PasswordChangeResult } from '@/accountApi.ts'
import { useAuth } from '@/auth/AuthContext.ts'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export type AccountSave = {
  status: SaveStatus
  error: string
  // true when the server saved it: the card then empties what must not stay on screen.
  run: (request: () => Promise<SaveResult>) => Promise<boolean>
}

type SaveResult = AccountSaveResult | PasswordChangeResult

// One per settings card: each card saves on its own and shows its own result.
export function useAccountSave(): AccountSave {
  const { dropUser, replaceUser } = useAuth()
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [error, setError] = useState('')

  async function run(request: () => Promise<SaveResult>): Promise<boolean> {
    setStatus('saving')
    const result = await request()
    // The session ended on the server: RequireAuth sends the user to /login.
    if (result.status === 'unauthenticated') {
      dropUser()
      return false
    }
    if (result.status === 'failed') {
      setError(result.message)
      setStatus('error')
      return false
    }
    // The app bar, the menus and the other cards read the user from AuthContext.
    if ('user' in result) replaceUser(result.user)
    setStatus('saved')
    return true
  }

  return { status, error, run }
}
