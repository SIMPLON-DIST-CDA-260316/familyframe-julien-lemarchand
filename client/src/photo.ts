// Copy of server/src/types.ts, see why there. Keep both in sync.

// createdAt is an ISO 8601 string: JSON has no dates.
export type Photo = {
  id: string
  url: string
  thumbnailUrl: string
  createdAt: string
}

// nextCursor is the id to send as cursor for the next page; null on the last page.
export type PhotoPage = {
  photos: Photo[]
  nextCursor: string | null
}

export type ServerToClientEvents = {
  'photo:new': (photo: Photo) => void
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
    typeof value.createdAt === 'string'
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
