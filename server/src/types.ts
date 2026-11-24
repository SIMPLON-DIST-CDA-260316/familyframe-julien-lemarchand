// Duplicated in client/src on purpose: a shared package would complicate the Docker builds.
// Keep both copies in sync.

export type ApiErrorCode =
  | 'PHOTO_MISSING'
  | 'UPLOAD_INVALID'
  | 'BODY_INVALID'
  | 'QUERY_INVALID'
  | 'UNAUTHENTICATED'
  | 'INVALID_CREDENTIALS'
  | 'ROUTE_NOT_FOUND'
  | 'PHOTO_NOT_FOUND'
  | 'PHOTO_DUPLICATE'
  | 'PHOTO_TOO_LARGE'
  | 'FORMAT_UNSUPPORTED'
  | 'IMAGE_UNREADABLE'
  | 'SERVER_ERROR'

export type ApiError = { error: ApiErrorCode }

export type UserRole = 'member' | 'admin'

// What the API says about a user: never the password hash.
export type PublicUser = {
  id: string
  email: string
  displayName: string
  role: UserRole
}

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

export type ClientToServerEvents = Record<string, never>
