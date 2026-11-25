import { errorMessage, UNAUTHORIZED_STATUS } from '@/api.ts'
import { isPhoto, isPhotoPage, type Photo, type PhotoPage } from '@/photo.ts'

// The server's MAX_PAGE_SIZE: the fewest requests for many photos.
const MAX_PAGE_SIZE = 100

// collectionId: only that collection's photos; left out for the whole library.
export type PageRequest = { cursor?: string; limit?: number; collectionId?: string }

export type UploadResult =
  | { status: 'uploaded'; photo: Photo }
  | { status: 'failed'; message: string }
  | { status: 'unauthenticated' }

// duplicate apart from failed: the share sheet names the friend who already has the photo.
export type ShareResult =
  | { status: 'shared' }
  | { status: 'duplicate' }
  | { status: 'failed'; message: string }
  | { status: 'unauthenticated' }

function photosUrl({ cursor, limit, collectionId }: PageRequest): string {
  const params = new URLSearchParams()
  if (cursor !== undefined) params.set('cursor', cursor)
  if (limit !== undefined) params.set('limit', String(limit))
  if (collectionId !== undefined) params.set('collectionId', collectionId)
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
    // A refused load, such as a collection deleted elsewhere (404): the page says so already.
    if (!res.ok) return null
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
    const page = await fetchPhotoPage({ cursor, limit: MAX_PAGE_SIZE }, onUnauthenticated)
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

// The newest `count` photos as one page, so a reload gives back as many as were shown. null as
// soon as one page fails.
export async function fetchNewestPhotos(
  count: number,
  collectionId: string | undefined,
  onUnauthenticated: () => void,
): Promise<PhotoPage | null> {
  const photos: Photo[] = []
  let cursor: string | undefined
  while (photos.length < count) {
    const limit = Math.min(count - photos.length, MAX_PAGE_SIZE)
    const page = await fetchPhotoPage({ cursor, limit, collectionId }, onUnauthenticated)
    if (page === null) return null
    photos.push(...page.photos)
    // An empty page with a cursor would ask for the same page forever.
    if (page.nextCursor === null || page.photos.length === 0) return { ...page, photos }
    cursor = page.nextCursor
  }
  return { photos, nextCursor: cursor ?? null }
}

export async function postPhoto(file: File): Promise<UploadResult> {
  const body = new FormData()
  body.append('photo', file)
  try {
    const res = await fetch('/api/photos', { method: 'POST', body })
    if (res.status === UNAUTHORIZED_STATUS) return { status: 'unauthenticated' }
    // Not JSON when the dev proxy answers for a stopped API.
    const data: unknown = await res.json().catch(() => null)
    if (res.ok && isPhoto(data)) return { status: 'uploaded', photo: data }
    return { status: 'failed', message: errorMessage(data) }
  } catch {
    // fetch rejects only on network failure.
    return { status: 'failed', message: errorMessage(null) }
  }
}

function isDuplicateError(body: unknown): boolean {
  return (
    typeof body === 'object' && body !== null && 'error' in body && body.error === 'PHOTO_DUPLICATE'
  )
}

// The sender's screen shows nothing of the new photo: the result carries no Photo.
async function sendShare(url: string, init: RequestInit): Promise<ShareResult> {
  try {
    const res = await fetch(url, { method: 'POST', ...init })
    if (res.status === UNAUTHORIZED_STATUS) return { status: 'unauthenticated' }
    if (res.ok) return { status: 'shared' }
    // Not JSON when the dev proxy answers for a stopped API.
    const data: unknown = await res.json().catch(() => null)
    if (isDuplicateError(data)) return { status: 'duplicate' }
    return { status: 'failed', message: errorMessage(data) }
  } catch {
    // fetch rejects only on network failure.
    return { status: 'failed', message: errorMessage(null) }
  }
}

// A blank message is no message: the field stays out of the request.
export function postLibraryShare(
  photoId: string,
  friendId: string,
  message: string,
): Promise<ShareResult> {
  const trimmedMessage = message.trim()
  return sendShare(`/api/photos/${photoId}/share`, {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(
      trimmedMessage === '' ? { friendId } : { friendId, message: trimmedMessage },
    ),
  })
}

export function postDeviceShare(
  file: File,
  friendId: string,
  message: string,
): Promise<ShareResult> {
  const trimmedMessage = message.trim()
  const body = new FormData()
  body.append('photo', file)
  body.append('friendId', friendId)
  if (trimmedMessage !== '') body.append('message', trimmedMessage)
  return sendShare('/api/photos/share', { body })
}
