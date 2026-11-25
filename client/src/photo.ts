// Copy of server/src/types.ts, see why there. Keep both in sync.

// createdAt is an ISO 8601 string: JSON has no dates. senderName is the display name of the
// friend who sent the photo, null for a photo its owner uploaded. message is the note the
// friend wrote with it, null without one.
export type Photo = {
  id: string
  url: string
  thumbnailUrl: string
  createdAt: string
  senderName: string | null
  message: string | null
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
}

export function isPhoto(value: unknown): value is Photo {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'url' in value &&
    typeof value.url === 'string' &&
    'thumbnailUrl' in value &&
    typeof value.thumbnailUrl === 'string' &&
    'createdAt' in value &&
    typeof value.createdAt === 'string' &&
    'senderName' in value &&
    (value.senderName === null || typeof value.senderName === 'string') &&
    'message' in value &&
    (value.message === null || typeof value.message === 'string')
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
