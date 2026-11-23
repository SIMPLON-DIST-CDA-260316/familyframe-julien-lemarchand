// Types shared with the client. Duplicated in client/src on purpose:
// a shared package would complicate the Docker builds (J2). Keep both copies in sync.

export type ApiErrorCode =
  | 'NICKNAME_INVALID'
  | 'PHOTO_MISSING'
  | 'UPLOAD_INVALID'
  | 'PHOTO_TOO_LARGE'
  | 'FORMAT_UNSUPPORTED'
  | 'IMAGE_UNREADABLE'
  | 'SERVER_ERROR'

export type ApiError = { error: ApiErrorCode }

// A photo as sent to the client (REST and Socket.IO). createdAt is an ISO 8601 string.
export type Photo = { id: string; url: string; nickname: string; createdAt: string }
