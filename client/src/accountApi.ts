import { errorMessage, UNAUTHORIZED_STATUS } from '@/api.ts'
import { readUser } from '@/auth/authApi.ts'
import type { PublicUser } from '@/auth/user.ts'

// user: the account as the server saved it, for AuthContext.
export type AccountSaveResult =
  | { status: 'saved'; user: PublicUser }
  | { status: 'failed'; message: string }
  | { status: 'unauthenticated' }

// Every route that edits the account answers { user }.
async function sendForUser(url: string, init: RequestInit): Promise<AccountSaveResult> {
  try {
    const res = await fetch(url, init)
    if (res.status === UNAUTHORIZED_STATUS) return { status: 'unauthenticated' }
    // Not JSON when the dev proxy answers for a stopped API.
    const data: unknown = await res.json().catch(() => null)
    const user = res.ok ? readUser(data) : null
    return user ? { status: 'saved', user } : { status: 'failed', message: errorMessage(data) }
  } catch {
    // fetch rejects only on network failure.
    return { status: 'failed', message: errorMessage(null) }
  }
}

export function patchDisplayName(displayName: string): Promise<AccountSaveResult> {
  return sendForUser('/api/account', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName }),
  })
}
