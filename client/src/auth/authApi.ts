import { errorMessage } from '@/api.ts'
import { isPublicUser, type PublicUser } from '@/auth/user.ts'

export type LoginResult =
  | { isSuccess: true; user: PublicUser }
  | { isSuccess: false; message: string }

// Both /login and /me answer { user }.
function readUser(body: unknown): PublicUser | null {
  if (typeof body === 'object' && body !== null && 'user' in body && isPublicUser(body.user)) {
    return body.user
  }
  return null
}

// null also on a network failure: the login page is where the user can retry.
export async function fetchCurrentUser(): Promise<PublicUser | null> {
  try {
    const res = await fetch('/api/auth/me')
    if (!res.ok) return null
    return readUser(await res.json())
  } catch {
    return null
  }
}

export async function postLogin(email: string, password: string): Promise<LoginResult> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    // Not JSON when the dev proxy answers for a stopped API.
    const data: unknown = await res.json().catch(() => null)
    const user = res.ok ? readUser(data) : null
    return user ? { isSuccess: true, user } : { isSuccess: false, message: errorMessage(data) }
  } catch {
    return { isSuccess: false, message: errorMessage(null) }
  }
}

// The client forgets the user even if the call fails: the next page load asks /me again.
export async function postLogout(): Promise<void> {
  try {
    await fetch('/api/auth/logout', { method: 'POST' })
  } catch {
    // Ignored, see above.
  }
}
