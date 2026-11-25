// Duplicated in client/src on purpose: a shared package would complicate the Docker builds.
// Keep both copies in sync.

export type ApiErrorCode =
  | 'PHOTO_MISSING'
  | 'EMAIL_INVALID'
  | 'UPLOAD_INVALID'
  | 'BODY_INVALID'
  | 'QUERY_INVALID'
  | 'DISPLAY_NAME_INVALID'
  | 'PASSWORD_INVALID'
  | 'PASSWORD_INCORRECT'
  | 'MESSAGE_INVALID'
  | 'SELF_FRIEND'
  | 'UNAUTHENTICATED'
  | 'INVALID_CREDENTIALS'
  | 'FORBIDDEN'
  | 'NOT_FRIENDS'
  | 'ROUTE_NOT_FOUND'
  | 'PHOTO_NOT_FOUND'
  | 'INVITATION_NOT_FOUND'
  | 'USER_NOT_FOUND'
  | 'FRIENDSHIP_NOT_FOUND'
  | 'PHOTO_DUPLICATE'
  | 'ACCOUNT_EXISTS'
  | 'ALREADY_FRIENDS'
  | 'FRIEND_REQUEST_EXISTS'
  | 'INVITATION_EXPIRED'
  | 'INVITATION_USED'
  | 'PHOTO_TOO_LARGE'
  | 'FORMAT_UNSUPPORTED'
  | 'IMAGE_UNREADABLE'
  | 'SERVER_ERROR'

export type ApiError = { error: ApiErrorCode }

export type UserRole = 'member' | 'admin'

// What the API says about a user: never the password hash. avatarUrl is null until the account
// picks a profile photo.
export type PublicUser = {
  id: string
  email: string
  displayName: string
  role: UserRole
  avatarUrl: string | null
}

export type InvitationStatus = 'pending' | 'used' | 'expired'

// createdAt and expiresAt are ISO 8601 strings; the token's hash never leaves the server.
export type Invitation = {
  id: string
  email: string
  status: InvitationStatus
  createdAt: string
  expiresAt: string
}

// The raw token, sent once at creation: the admin's page builds the link from it.
export type CreatedInvitation = {
  invitation: Invitation
  token: string
}

// What a friend sees of another account: never its role or its password hash.
export type FriendUser = {
  id: string
  displayName: string
  email: string
  avatarUrl: string | null
}

// id is the friendship's, user the other side; createdAt is an ISO 8601 string.
export type Friendship = {
  id: string
  user: FriendUser
  createdAt: string
}

export type FriendshipList = {
  friends: Friendship[]
  incoming: Friendship[]
  outgoing: Friendship[]
}

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

export type ClientToServerEvents = Record<string, never>
