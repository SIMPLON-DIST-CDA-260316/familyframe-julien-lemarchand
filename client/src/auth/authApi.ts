import { errorMessage, UNAUTHORIZED_STATUS } from '@/api.ts'
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

export type CurrentUserResult =
  | { status: 'authenticated'; user: PublicUser }
  | { status: 'unauthenticated' }
  | { status: 'unreachable' }

// Only a 401 means "no session": a network error or a 5xx must not send a frame with a valid cookie to /login.
export async function fetchCurrentUser(): Promise<CurrentUserResult> {
  try {
    const res = await fetch('/api/auth/me')
    if (res.status === UNAUTHORIZED_STATUS) return { status: 'unauthenticated' }
    if (!res.ok) return { status: 'unreachable' }
    const user = readUser(await res.json())
    return user ? { status: 'authenticated', user } : { status: 'unreachable' }
  } catch {
    return { status: 'unreachable' }
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
