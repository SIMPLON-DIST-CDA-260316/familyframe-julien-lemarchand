import { errorMessage, UNAUTHORIZED_STATUS } from '@/api.ts'
import { type FriendshipList, isFriendshipList } from '@/friendship.ts'

export type FriendshipListResult =
  | { isSuccess: true; friendships: FriendshipList }
  | { isSuccess: false; message: string }

// The page reloads the whole list after every action: a success carries nothing more.
export type FriendshipActionResult = { isSuccess: true } | { isSuccess: false; message: string }

// A 401 calls onUnauthenticated: the session ended on the server, the provider drops the user.
export async function fetchFriendships(
  onUnauthenticated: () => void,
): Promise<FriendshipListResult> {
  try {
    const res = await fetch('/api/friendships')
    if (res.status === UNAUTHORIZED_STATUS) onUnauthenticated()
    // Not JSON when the dev proxy answers for a stopped API.
    const data: unknown = await res.json().catch(() => null)
    if (res.ok && isFriendshipList(data)) return { isSuccess: true, friendships: data }
    return { isSuccess: false, message: errorMessage(data) }
  } catch {
    // fetch rejects only on network failure.
    return { isSuccess: false, message: errorMessage(null) }
  }
}

async function sendAction(
  url: string,
  init: RequestInit,
  onUnauthenticated: () => void,
): Promise<FriendshipActionResult> {
  try {
    const res = await fetch(url, init)
    if (res.status === UNAUTHORIZED_STATUS) onUnauthenticated()
    if (res.ok) return { isSuccess: true }
    const data: unknown = await res.json().catch(() => null)
    return { isSuccess: false, message: errorMessage(data) }
  } catch {
    return { isSuccess: false, message: errorMessage(null) }
  }
}

export function postFriendRequest(
  email: string,
  onUnauthenticated: () => void,
): Promise<FriendshipActionResult> {
  const init: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  }
  return sendAction('/api/friendships', init, onUnauthenticated)
}

export function postAcceptFriendship(
  id: string,
  onUnauthenticated: () => void,
): Promise<FriendshipActionResult> {
  return sendAction(`/api/friendships/${id}/accept`, { method: 'POST' }, onUnauthenticated)
}

// One call for the three ways out: refuse, cancel and remove.
export function deleteFriendship(
  id: string,
  onUnauthenticated: () => void,
): Promise<FriendshipActionResult> {
  return sendAction(`/api/friendships/${id}`, { method: 'DELETE' }, onUnauthenticated)
}
