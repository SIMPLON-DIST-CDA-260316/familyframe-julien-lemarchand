import { UNAUTHORIZED_STATUS } from '@/api.ts'
import { isPhotoPage, type Photo, type PhotoPage } from '@/photo.ts'

// The server's MAX_PAGE_SIZE: the fewest requests for a whole library.
const FRAME_PAGE_SIZE = 100

export type PageRequest = { cursor?: string; limit?: number }

function photosUrl({ cursor, limit }: PageRequest): string {
  const params = new URLSearchParams()
  if (cursor !== undefined) params.set('cursor', cursor)
  if (limit !== undefined) params.set('limit', String(limit))
  const query = params.toString()
  return query === '' ? '/api/photos' : `/api/photos?${query}`
}

// null keeps the photos already shown when a load fails.
export async function fetchPhotoPage(
  request: PageRequest,
  onUnauthenticated: () => void,
): Promise<PhotoPage | null> {
  try {
    const res = await fetch(photosUrl(request))
    if (res.status === UNAUTHORIZED_STATUS) {
      onUnauthenticated()
      return null
    }
    const data: unknown = await res.json()
    if (isPhotoPage(data)) return data
    // Client and API images out of sync: say so instead of waiting forever.
    console.error('Unexpected photos payload from the API')
    return null
  } catch (error: unknown) {
    console.error('Could not load photos', error)
    return null
  }
}

// Every page: old photos never silently leave a gift frame. null as soon as one page fails,
// or when the server repeats a cursor, which would loop forever.
export async function fetchAllPhotos(onUnauthenticated: () => void): Promise<Photo[] | null> {
  const photos: Photo[] = []
  let cursor: string | undefined
  do {
    const page = await fetchPhotoPage({ cursor, limit: FRAME_PAGE_SIZE }, onUnauthenticated)
    if (page === null) return null
    if (page.nextCursor === cursor) {
      console.error('Photos cursor did not advance')
      return null
    }
    photos.push(...page.photos)
    cursor = page.nextCursor ?? undefined
  } while (cursor !== undefined)
  return photos
}
