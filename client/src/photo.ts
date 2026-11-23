// Duplicated from server/src/types.ts on purpose (see the comment there): keep both in sync.

// A photo as sent by the API and over Socket.IO. createdAt is an ISO 8601 string.
export type Photo = { id: string; url: string; nickname: string; createdAt: string }

// Socket.IO events sent by the server.
export type ServerToClientEvents = {
  'photo:new': (photo: Photo) => void
}

// Data from the network is unknown until checked: this guard checks the shape of a Photo.
export function isPhoto(value: unknown): value is Photo {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'url' in value &&
    typeof value.url === 'string' &&
    'nickname' in value &&
    typeof value.nickname === 'string' &&
    'createdAt' in value &&
    typeof value.createdAt === 'string'
  )
}
