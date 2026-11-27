import { errorMessage, UNAUTHORIZED_STATUS } from '@/api.ts'
import { isSendPage, type SendPage } from '@/sentPhoto.ts'

export type SendPageResult =
  | { isSuccess: true; page: SendPage }
  | { isSuccess: false; message: string }

// gone: another tab or device removed it first; the page reloads its history then.
// unauthenticated: the provider already sends the user to the login page, nothing to show.
export type SendRemovalResult =
  | { status: 'removed' }
  | { status: 'gone'; message: string }
  | { status: 'failed'; message: string }
  | { status: 'unauthenticated' }

const NOT_FOUND_STATUS = 404

function sendsUrl(cursor: string | undefined): string {
  return cursor === undefined ? '/api/sends' : `/api/sends?cursor=${encodeURIComponent(cursor)}`
}

// A 401 calls onUnauthenticated: the session ended on the server, the provider drops the user.
export async function fetchSendPage(
  cursor: string | undefined,
  onUnauthenticated: () => void,
): Promise<SendPageResult> {
  try {
    const res = await fetch(sendsUrl(cursor))
    if (res.status === UNAUTHORIZED_STATUS) onUnauthenticated()
    // Not JSON when the dev proxy answers for a stopped API.
    const data: unknown = await res.json().catch(() => null)
    if (res.ok && isSendPage(data)) return { isSuccess: true, page: data }
    return { isSuccess: false, message: errorMessage(data) }
  } catch {
    // fetch rejects only on network failure.
    return { isSuccess: false, message: errorMessage(null) }
  }
}

export async function removeSend(
  id: string,
  onUnauthenticated: () => void,
): Promise<SendRemovalResult> {
  try {
    const res = await fetch(`/api/sends/${encodeURIComponent(id)}`, { method: 'DELETE' })
    if (res.ok) return { status: 'removed' }
    if (res.status === UNAUTHORIZED_STATUS) {
      onUnauthenticated()
      return { status: 'unauthenticated' }
    }
    const data: unknown = await res.json().catch(() => null)
    const message = errorMessage(data)
    return res.status === NOT_FOUND_STATUS
      ? { status: 'gone', message }
      : { status: 'failed', message }
  } catch {
    return { status: 'failed', message: errorMessage(null) }
  }
}
