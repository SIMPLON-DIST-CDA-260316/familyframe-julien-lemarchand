// Copy of server/src/types.ts, see why there. Keep both in sync.

// createdAt is an ISO 8601 string: JSON has no dates.
export type Photo = {
  id: string
  url: string
  thumbnailUrl: string
  createdAt: string
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
