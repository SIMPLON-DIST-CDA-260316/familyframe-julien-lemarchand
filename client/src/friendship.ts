// Copy of server/src/types.ts, see why there. Keep both in sync.
export type FriendUser = {
  id: string
  displayName: string
  email: string
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

function isFriendUser(value: unknown): value is FriendUser {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'displayName' in value &&
    typeof value.displayName === 'string' &&
    'email' in value &&
    typeof value.email === 'string'
  )
}

function isFriendship(value: unknown): value is Friendship {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'user' in value &&
    isFriendUser(value.user) &&
    'createdAt' in value &&
    typeof value.createdAt === 'string'
  )
}

function isFriendshipArray(value: unknown): value is Friendship[] {
  return Array.isArray(value) && value.every(isFriendship)
}

export function isFriendshipList(value: unknown): value is FriendshipList {
  return (
    typeof value === 'object' &&
    value !== null &&
    'friends' in value &&
    isFriendshipArray(value.friends) &&
    'incoming' in value &&
    isFriendshipArray(value.incoming) &&
    'outgoing' in value &&
    isFriendshipArray(value.outgoing)
  )
}

// The body of a request, an acceptance: one friendship.
export function isFriendshipBody(value: unknown): value is { friendship: Friendship } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'friendship' in value &&
    isFriendship(value.friendship)
  )
}
