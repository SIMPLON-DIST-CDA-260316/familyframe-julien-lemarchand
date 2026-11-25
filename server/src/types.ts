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
  | 'COLLECTION_NAME_INVALID'
  | 'UNAUTHENTICATED'
  | 'INVALID_CREDENTIALS'
  | 'FORBIDDEN'
  | 'ROUTE_NOT_FOUND'
  | 'PHOTO_NOT_FOUND'
  | 'SEND_NOT_FOUND'
  | 'INVITATION_NOT_FOUND'
  | 'USER_NOT_FOUND'
  | 'FRIENDSHIP_NOT_FOUND'
  | 'COLLECTION_NOT_FOUND'
  | 'PHOTO_DUPLICATE'
  | 'ACCOUNT_EXISTS'
  | 'ALREADY_FRIENDS'
  | 'FRIEND_REQUEST_EXISTS'
  | 'COLLECTION_EXISTS'
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
// friend wrote with it, null without one. width and height (px) and bytes describe the stored
// image; all three null on a photo stored before step 15.
export type Photo = {
  id: string
  url: string
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

// A friend named in a history line, under their current name, as on a received photo.
export type SendRecipient = { id: string; displayName: string }

// One line of the sender's history: one send action, even to several friends. recipients lists
// only the friends who received it; createdAt is an ISO 8601 string.
export type SentPhoto = {
  id: string
  url: string
  thumbnailUrl: string
  createdAt: string
  message: string | null
  recipients: SendRecipient[]
}

// Newest first; nextCursor as for the library's pages.
export type SendPage = {
  sends: SentPhoto[]
  nextCursor: string | null
}

// not_friends: no accepted friend's id (unknown, pending, oneself, malformed); duplicate: the
// friend already has this file.
export type SendOutcomeStatus = 'sent' | 'duplicate' | 'not_friends'

export type SendOutcome = { friendId: string; status: SendOutcomeStatus }

// send is null when nobody received the photo: nothing joins the history then.
export type SendResult = {
  send: SentPhoto | null
  outcomes: SendOutcome[]
}

// photoIds: the owner's photos, in the order they were added; a deleted photo is not listed.
// coverUrl: the signed thumbnail of its newest photo. oldestPhotoAt and newestPhotoAt: ISO dates
// of its oldest and newest photos. All three null while it is empty.
export type Collection = {
  id: string
  name: string
  photoIds: string[]
  coverUrl: string | null
  oldestPhotoAt: string | null
  newestPhotoAt: string | null
}

// Sorted by name: the order of every menu that lists them.
export type CollectionList = { collections: Collection[] }

// A selection names its photos by id: the frame finds them in the library it already holds.
export type Selection = { photoIds: string[] }

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

export type ClientToServerEvents = Record<string, never>
