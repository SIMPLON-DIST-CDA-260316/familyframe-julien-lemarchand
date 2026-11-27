// Copy of server/src/types.ts, see why there. Keep both in sync.

// createdAt is an ISO 8601 string: JSON has no dates. senderName is the display name of the
// friend who sent the photo, null for a photo its owner uploaded. message is the note the
// friend wrote with it, null without one. width and height (px) and bytes describe the stored
// image; all three null on a photo stored before step 15. url is at most 1920 px, mediumUrl
// at most 1280 px (phone screens), thumbnailUrl a 640 px square.
export type Photo = {
  id: string
  url: string
  mediumUrl: string
  thumbnailUrl: string
  createdAt: string
  senderName: string | null
  message: string | null
  width: number | null
  height: number | null
  bytes: number | null
}

// nextCursor is the id to send as cursor for the next page; null on the last page.
export type PhotoPage = {
  photos: Photo[]
  nextCursor: string | null
}

// Newest first, all at once: a handful of photos waiting, not a library to page through.
export type UnopenedPhotos = { photos: Photo[] }

// photo:new is a photo one added oneself, photo:received one a friend sent, still unopened;
// photo:opened is a received photo that just joined the library.
export type ServerToClientEvents = {
  'photo:new': (photo: Photo) => void
  'photo:received': (photo: Photo) => void
  'photo:opened': (photo: Photo) => void
  'photo:deleted': (id: string) => void
  // No payload: each page reloads the list, the server stays the only source.
  'collections:changed': () => void
}

function isNullableNumber(value: unknown): boolean {
  return value === null || typeof value === 'number'
}

export function isPhoto(value: unknown): value is Photo {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'url' in value &&
    typeof value.url === 'string' &&
    'mediumUrl' in value &&
    typeof value.mediumUrl === 'string' &&
    'thumbnailUrl' in value &&
    typeof value.thumbnailUrl === 'string' &&
    'createdAt' in value &&
    typeof value.createdAt === 'string' &&
    'senderName' in value &&
    (value.senderName === null || typeof value.senderName === 'string') &&
    'message' in value &&
    (value.message === null || typeof value.message === 'string') &&
    'width' in value &&
    isNullableNumber(value.width) &&
    'height' in value &&
    isNullableNumber(value.height) &&
    'bytes' in value &&
    isNullableNumber(value.bytes)
  )
}

export function isUnopenedPhotos(value: unknown): value is UnopenedPhotos {
  return (
    typeof value === 'object' &&
    value !== null &&
    'photos' in value &&
    Array.isArray(value.photos) &&
    value.photos.every(isPhoto)
  )
}

export function isPhotoPage(value: unknown): value is PhotoPage {
  return (
    typeof value === 'object' &&
    value !== null &&
    'photos' in value &&
    Array.isArray(value.photos) &&
    value.photos.every(isPhoto) &&
    'nextCursor' in value &&
    (value.nextCursor === null || typeof value.nextCursor === 'string')
  )
}
