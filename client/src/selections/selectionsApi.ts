import { UNAUTHORIZED_STATUS } from '@/api.ts'
import { isSelection, type Selection } from '@/selections/selection.ts'

// null when the selection could not load: the caller keeps what it shows, or plays the library.
async function fetchSelection(
  url: string,
  onUnauthenticated: () => void,
): Promise<Selection | null> {
  try {
    const res = await fetch(url)
    if (res.status === UNAUTHORIZED_STATUS) onUnauthenticated()
    // Not JSON when the dev proxy answers for a stopped API.
    const data: unknown = await res.json().catch(() => null)
    return res.ok && isSelection(data) ? data : null
  } catch {
    // fetch rejects only on network failure.
    return null
  }
}

export function fetchDailySelection(onUnauthenticated: () => void): Promise<Selection | null> {
  return fetchSelection('/api/selections/daily', onUnauthenticated)
}
