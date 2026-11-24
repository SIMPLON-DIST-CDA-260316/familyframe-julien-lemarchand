import { errorMessage, UNAUTHORIZED_STATUS } from '@/api.ts'
import { type FriendshipList, isFriendshipBody, isFriendshipList } from '@/friendship.ts'

export type FriendshipListResult =
  | { isSuccess: true; friendships: FriendshipList }
  | { isSuccess: false; message: string }

// The page reloads the whole list after every action: a success carries nothing more.
export type FriendshipActionResult = { isSuccess: true } | { isSuccess: false; message: string }

// isAccepted: their request was waiting, mine accepted it (200 instead of 201).
export type FriendRequestResult =
  | { isSuccess: true; isAccepted: boolean; friendName: string }
  | { isSuccess: false; message: string }

const OK_STATUS = 200

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

export async function postFriendRequest(
  email: string,
  onUnauthenticated: () => void,
): Promise<FriendRequestResult> {
  try {
    const res = await fetch('/api/friendships', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    if (res.status === UNAUTHORIZED_STATUS) onUnauthenticated()
    const data: unknown = await res.json().catch(() => null)
    if (res.ok && isFriendshipBody(data)) {
      const { displayName } = data.friendship.user
      return { isSuccess: true, isAccepted: res.status === OK_STATUS, friendName: displayName }
    }
    return { isSuccess: false, message: errorMessage(data) }
  } catch {
    return { isSuccess: false, message: errorMessage(null) }
  }
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
