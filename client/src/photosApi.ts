import { errorMessage, UNAUTHORIZED_STATUS } from '@/api.ts'
import { isPhoto, isPhotoPage, type Photo, type PhotoPage } from '@/photo.ts'
import { isSendResult, type SendOutcome } from '@/sentPhoto.ts'
import { postWithProgress } from '@/upload/postWithProgress.ts'

// The server's MAX_PAGE_SIZE: the fewest requests for many photos.
const MAX_PAGE_SIZE = 100
const NOT_FOUND_STATUS = 404

// collectionId: only that collection's photos; left out for the whole library.
export type PageRequest = { cursor?: string; limit?: number; collectionId?: string }

export type UploadResult =
  | { status: 'uploaded'; photo: Photo }
  | { status: 'failed'; message: string }
  | { status: 'unauthenticated' }

// done: the server answered for each friend; failed: the whole send was refused (photo gone,
// network…), nobody received it.
export type ShareResult =
  | { status: 'done'; outcomes: SendOutcome[] }
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
    // A collection deleted elsewhere: the page says so already.
    if (res.status === NOT_FOUND_STATUS) return null
    // Any other refusal, such as a 500, is a fault the page cannot explain: keep a trace of it.
    if (!res.ok) {
      console.error('Photos load refused by the API', res.status)
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

// The same answers as the fetch calls below, with the upload's progress on the way.
export async function postPhoto(
  file: File,
  onProgress: (percent: number) => void,
  signal: AbortSignal,
): Promise<UploadResult> {
  const body = new FormData()
  body.append('photo', file)
  const response = await postWithProgress('/api/photos', body, onProgress, signal)
  if (response === null) return { status: 'failed', message: errorMessage(null) }
  if (response.status === UNAUTHORIZED_STATUS) return { status: 'unauthenticated' }
  if (response.isOk && isPhoto(response.body)) {
    return { status: 'uploaded', photo: response.body }
  }
  return { status: 'failed', message: errorMessage(response.body) }
}

// One request for every friend chosen: the server records one send and answers per friend.
async function sendShare(url: string, init: RequestInit): Promise<ShareResult> {
  try {
    const res = await fetch(url, { method: 'POST', ...init })
    if (res.status === UNAUTHORIZED_STATUS) return { status: 'unauthenticated' }
    // Not JSON when the dev proxy answers for a stopped API.
    const data: unknown = await res.json().catch(() => null)
    if (res.ok && isSendResult(data)) return { status: 'done', outcomes: data.outcomes }
    return { status: 'failed', message: errorMessage(data) }
  } catch {
    // fetch rejects only on network failure.
    return { status: 'failed', message: errorMessage(null) }
  }
}

// A blank message is no message: the field stays out of the request.
export function postLibraryShare(
  photoId: string,
  friendIds: string[],
  message: string,
): Promise<ShareResult> {
  const trimmedMessage = message.trim()
  return sendShare(`/api/photos/${photoId}/share`, {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(
      trimmedMessage === '' ? { friendIds } : { friendIds, message: trimmedMessage },
    ),
  })
}

// One friendIds field per friend: multipart has no arrays, the server reads the repeats as one.
export function postDeviceShare(
  file: File,
  friendIds: string[],
  message: string,
): Promise<ShareResult> {
  const trimmedMessage = message.trim()
  const body = new FormData()
  body.append('photo', file)
  for (const friendId of friendIds) body.append('friendIds', friendId)
  if (trimmedMessage !== '') body.append('message', trimmedMessage)
  return sendShare('/api/photos/share', { body })
}
