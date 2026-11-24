import { AppError } from '../../errors/app-error.js'
import { parseEmail } from '../../lib/email.js'
import type { Logger } from '../../lib/logger.js'
import type { ApiErrorCode, Friendship, FriendshipList, FriendUser } from '../../types.js'
import { type AvatarUrlBuilder, toAvatarUrl } from '../auth/public-user.js'
import type {
  FriendshipParty,
  FriendshipRecord,
  FriendshipsRepository,
} from './friendships.repository.js'

// Prisma fails on an id that is not an ObjectId: that would be a 500, not a 404.
const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i

type RequestRefusal = 'user_not_found' | 'self' | 'already_friends' | 'request_exists'

const ERROR_BY_REFUSAL: Record<RequestRefusal, ApiErrorCode> = {
  user_not_found: 'USER_NOT_FOUND',
  self: 'SELF_FRIEND',
  already_friends: 'ALREADY_FRIENDS',
  request_exists: 'FRIEND_REQUEST_EXISTS',
}

// email comes straight from the JSON body: validated here, at the boundary.
export type FriendRequest = { email: unknown; requesterId: string }

// isAccepted: the other side had already asked, so the request answered theirs.
export type FriendRequestOutcome = { friendship: Friendship; isAccepted: boolean }

// id comes from the URL; userId is the logged-in account, on either side of the friendship.
export type FriendshipAction = { id: string; userId: string }

type DeletionReason = 'removed' | 'cancelled' | 'refused'

export type FriendshipsServiceDeps = {
  repository: FriendshipsRepository
  avatarUrl: AvatarUrlBuilder
  logger: Logger
}

export type FriendshipsService = {
  requestFriendship: (request: FriendRequest) => Promise<FriendRequestOutcome>
  listFriendships: (userId: string) => Promise<FriendshipList>
  deleteFriendship: (action: FriendshipAction) => Promise<void>
  acceptFriendship: (action: FriendshipAction) => Promise<Friendship>
  // Step 5 sends photos only between friends: it receives this, the rule stays here.
  areFriends: (userId: string, otherUserId: string) => Promise<boolean>
}

// The Cloudinary id stays on the server: the client gets a ready URL.
function toFriendUser(
  { id, displayName, email, avatarCloudinaryId }: FriendshipParty,
  avatarUrl: AvatarUrlBuilder,
): FriendUser {
  return { id, displayName, email, avatarUrl: toAvatarUrl(avatarCloudinaryId, avatarUrl) }
}

// user is the other side: whoever reads the friendship already knows who they are.
function toFriendship(
  record: FriendshipRecord,
  userId: string,
  avatarUrl: AvatarUrlBuilder,
): Friendship {
  const otherSide = record.requester.id === userId ? record.addressee : record.requester
  return {
    id: record.id,
    user: toFriendUser(otherSide, avatarUrl),
    createdAt: record.createdAt.toISOString(),
  }
}

function parseFriendshipId(id: string): string {
  if (!OBJECT_ID_PATTERN.test(id)) {
    throw new AppError('FRIENDSHIP_NOT_FOUND')
  }
  return id
}

// Ids and a reason only: never the email the sender typed.
function refusal(logger: Logger, reason: RequestRefusal, requesterId: string): AppError {
  logger.warn('friendship.request_failed', { reason, userId: requesterId })
  return new AppError(ERROR_BY_REFUSAL[reason])
}

async function findAddresseeId(
  { repository, logger }: FriendshipsServiceDeps,
  { email, requesterId }: FriendRequest,
): Promise<string> {
  const addresseeId = await repository.findUserIdByEmail(parseEmail(email))
  // Only logged-in members, all invited by the admin, can learn that an address has no account.
  if (addresseeId === null) {
    throw refusal(logger, 'user_not_found', requesterId)
  }
  if (addresseeId === requesterId) {
    throw refusal(logger, 'self', requesterId)
  }
  return addresseeId
}

// The reverse request is accepted by the same atomic write as « Accepter »: null means it was
// cancelled or answered in between.
async function acceptReverseRequest(
  { repository, avatarUrl, logger }: FriendshipsServiceDeps,
  reverse: FriendshipRecord,
  requesterId: string,
): Promise<FriendRequestOutcome> {
  const record = await repository.acceptReceived(reverse.id, requesterId)
  if (!record) {
    throw refusal(logger, 'request_exists', requesterId)
  }
  logger.info('friendship.accepted', { friendshipId: record.id, userId: requesterId })
  return { friendship: toFriendship(record, requesterId, avatarUrl), isAccepted: true }
}

async function createRequest(
  { repository, avatarUrl, logger }: FriendshipsServiceDeps,
  requesterId: string,
  addresseeId: string,
): Promise<FriendRequestOutcome> {
  // The unique pairKey is the real guarantee: a concurrent request, in either order, ends here.
  const record = await repository.create({ requesterId, addresseeId })
  if (!record) {
    throw refusal(logger, 'request_exists', requesterId)
  }
  logger.info('friendship.requested', { friendshipId: record.id, userId: requesterId })
  return { friendship: toFriendship(record, requesterId, avatarUrl), isAccepted: false }
}

// Asking someone who already asked me means yes: the request accepts theirs.
async function requestFriendship(
  deps: FriendshipsServiceDeps,
  request: FriendRequest,
): Promise<FriendRequestOutcome> {
  const { requesterId } = request
  const addresseeId = await findAddresseeId(deps, request)
  const existing = await deps.repository.findBetween(requesterId, addresseeId)
  if (existing?.status === 'accepted') {
    throw refusal(deps.logger, 'already_friends', requesterId)
  }
  if (existing?.requesterId === requesterId) {
    throw refusal(deps.logger, 'request_exists', requesterId)
  }
  if (existing) {
    return acceptReverseRequest(deps, existing, requesterId)
  }
  return createRequest(deps, requesterId, addresseeId)
}

async function listFriendships(
  { repository, avatarUrl }: FriendshipsServiceDeps,
  userId: string,
): Promise<FriendshipList> {
  const records = await repository.findAllOf(userId)
  const toFriendships = (selected: FriendshipRecord[]): Friendship[] =>
    selected.map((record) => toFriendship(record, userId, avatarUrl))
  const pendingRecords = records.filter(({ status }) => status === 'pending')
  return {
    friends: toFriendships(records.filter(({ status }) => status === 'accepted')),
    incoming: toFriendships(pendingRecords.filter(({ addresseeId }) => addresseeId === userId)),
    outgoing: toFriendships(pendingRecords.filter(({ requesterId }) => requesterId === userId)),
  }
}

function deletionReasonOf(
  { status, requesterId }: FriendshipRecord,
  userId: string,
): DeletionReason {
  if (status === 'accepted') {
    return 'removed'
  }
  return requesterId === userId ? 'cancelled' : 'refused'
}

// Refuse, cancel and remove are the same write: only the log tells them apart.
async function deleteFriendship(
  { repository, logger }: FriendshipsServiceDeps,
  { id, userId }: FriendshipAction,
): Promise<void> {
  // Someone else's friendship answers like a missing one: its existence does not leak.
  const record = await repository.deleteOf(parseFriendshipId(id), userId)
  if (!record) {
    throw new AppError('FRIENDSHIP_NOT_FOUND')
  }
  const reason = deletionReasonOf(record, userId)
  logger.info('friendship.deleted', { friendshipId: record.id, userId, reason })
}

// Filtered on the addressee and the pending status: one atomic write, no read-then-write race,
// and the requester cannot accept their own request.
async function acceptFriendship(
  { repository, avatarUrl, logger }: FriendshipsServiceDeps,
  { id, userId }: FriendshipAction,
): Promise<Friendship> {
  const record = await repository.acceptReceived(parseFriendshipId(id), userId)
  if (!record) {
    throw new AppError('FRIENDSHIP_NOT_FOUND')
  }
  logger.info('friendship.accepted', { friendshipId: record.id, userId })
  return toFriendship(record, userId, avatarUrl)
}

async function areFriends(
  { repository }: FriendshipsServiceDeps,
  userId: string,
  otherUserId: string,
): Promise<boolean> {
  const friendship = await repository.findBetween(userId, otherUserId)
  return friendship?.status === 'accepted'
}

export function createFriendshipsService(deps: FriendshipsServiceDeps): FriendshipsService {
  return {
    requestFriendship: (request) => requestFriendship(deps, request),
    listFriendships: (userId) => listFriendships(deps, userId),
    deleteFriendship: (action) => deleteFriendship(deps, action),
    acceptFriendship: (action) => acceptFriendship(deps, action),
    areFriends: (userId, otherUserId) => areFriends(deps, userId, otherUserId),
  }
}
