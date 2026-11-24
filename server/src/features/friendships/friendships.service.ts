import { AppError } from '../../errors/app-error.js'
import { parseEmail } from '../../lib/email.js'
import type { Logger } from '../../lib/logger.js'
import type { ApiErrorCode, Friendship, FriendshipList } from '../../types.js'
import type { FriendshipRecord, FriendshipsRepository } from './friendships.repository.js'

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

// id comes from the URL; userId is the logged-in account, on either side of the friendship.
export type FriendshipAction = { id: string; userId: string }

type DeletionReason = 'removed' | 'cancelled' | 'refused'

export type FriendshipsServiceDeps = {
  repository: FriendshipsRepository
  logger: Logger
}

export type FriendshipsService = {
  requestFriendship: (request: FriendRequest) => Promise<Friendship>
  listFriendships: (userId: string) => Promise<FriendshipList>
  deleteFriendship: (action: FriendshipAction) => Promise<void>
}

// user is the other side: whoever reads the friendship already knows who he is.
function toFriendship(record: FriendshipRecord, userId: string): Friendship {
  return {
    id: record.id,
    user: record.requester.id === userId ? record.addressee : record.requester,
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

async function rejectExistingPair(
  { repository, logger }: FriendshipsServiceDeps,
  requesterId: string,
  addresseeId: string,
): Promise<void> {
  const existing = await repository.findBetween(requesterId, addresseeId)
  if (existing?.status === 'accepted') {
    throw refusal(logger, 'already_friends', requesterId)
  }
  // Either direction: a reverse request already waits on the sender's page, with « Accepter ».
  if (existing?.status === 'pending') {
    throw refusal(logger, 'request_exists', requesterId)
  }
}

async function requestFriendship(
  deps: FriendshipsServiceDeps,
  request: FriendRequest,
): Promise<Friendship> {
  const { requesterId } = request
  const addresseeId = await findAddresseeId(deps, request)
  await rejectExistingPair(deps, requesterId, addresseeId)
  // The unique pairKey is the real guarantee: a concurrent request, in either order, ends here.
  const record = await deps.repository.create({ requesterId, addresseeId })
  if (!record) {
    throw refusal(deps.logger, 'request_exists', requesterId)
  }
  deps.logger.info('friendship.requested', { friendshipId: record.id, userId: requesterId })
  return toFriendship(record, requesterId)
}

async function listFriendships(
  { repository }: FriendshipsServiceDeps,
  userId: string,
): Promise<FriendshipList> {
  const records = await repository.findAllOf(userId)
  const toFriendships = (selected: FriendshipRecord[]): Friendship[] =>
    selected.map((record) => toFriendship(record, userId))
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

export function createFriendshipsService(deps: FriendshipsServiceDeps): FriendshipsService {
  return {
    requestFriendship: (request) => requestFriendship(deps, request),
    listFriendships: (userId) => listFriendships(deps, userId),
    deleteFriendship: (action) => deleteFriendship(deps, action),
  }
}
