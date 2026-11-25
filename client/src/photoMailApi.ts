import { UNAUTHORIZED_STATUS } from '@/api.ts'
import { isUnopenedPhotos, type Photo } from '@/photo.ts'

// failed keeps the photo waiting: the next reveal shows it again.
export type OpenResult = 'opened' | 'failed' | 'unauthenticated'

// Newest first. null keeps the photos already announced when a load fails.
export async function fetchUnopenedPhotos(onUnauthenticated: () => void): Promise<Photo[] | null> {
  try {
    const res = await fetch('/api/photos/unopened')
    if (res.status === UNAUTHORIZED_STATUS) {
      onUnauthenticated()
      return null
    }
    const data: unknown = await res.json()
    if (isUnopenedPhotos(data)) return data.photos
    console.error('Unexpected unopened photos payload from the API')
    return null
  } catch (error: unknown) {
    console.error('Could not load unopened photos', error)
    return null
  }
}

export async function postOpenPhoto(id: string): Promise<OpenResult> {
  try {
    const res = await fetch(`/api/photos/${id}/open`, { method: 'POST' })
    if (res.status === UNAUTHORIZED_STATUS) return 'unauthenticated'
    return res.ok ? 'opened' : 'failed'
  } catch (error: unknown) {
    console.error('Could not open the photo', error)
    return 'failed'
  }
}
