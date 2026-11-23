// Duplicated in client/src on purpose: a shared package would complicate the Docker builds.
// Keep both copies in sync.

export type ApiErrorCode =
  | 'UPLOADER_NAME_INVALID'
  | 'PHOTO_MISSING'
  | 'UPLOAD_INVALID'
  | 'ROUTE_NOT_FOUND'
  | 'PHOTO_NOT_FOUND'
  | 'PHOTO_TOO_LARGE'
  | 'FORMAT_UNSUPPORTED'
  | 'IMAGE_UNREADABLE'
  | 'SERVER_ERROR'

export type ApiError = { error: ApiErrorCode }

// createdAt is an ISO 8601 string: JSON has no dates.
export type Photo = {
  id: string
  url: string
  thumbnailUrl: string
  uploaderName: string
  createdAt: string
}

export type ServerToClientEvents = {
  'photo:new': (photo: Photo) => void
  'photo:deleted': (id: string) => void
}

export type ClientToServerEvents = Record<string, never>
