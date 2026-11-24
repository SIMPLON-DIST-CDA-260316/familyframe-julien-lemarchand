import { Prisma, type PrismaClient } from '@prisma/client'

// The other side's public fields only: the password hash never leaves the repository.
const PARTY_FIELDS = {
  id: true,
  email: true,
  displayName: true,
  avatarCloudinaryId: true,
} satisfies Prisma.UserSelect
const WITH_PARTIES = {
  requester: { select: PARTY_FIELDS },
  addressee: { select: PARTY_FIELDS },
} satisfies Prisma.FriendshipInclude

export type FriendshipRecord = Prisma.FriendshipGetPayload<{ include: typeof WITH_PARTIES }>

export type FriendshipParty = FriendshipRecord['requester']

export type NewFriendship = { requesterId: string; addresseeId: string }

export type FriendshipsRepository = {
  findUserIdByEmail: (email: string) => Promise<string | null>
  findBetween: (userId: string, otherUserId: string) => Promise<FriendshipRecord | null>
  // null when the pair already has a row (a concurrent request): the service decides the error.
  create: (friendship: NewFriendship) => Promise<FriendshipRecord | null>
  findAllOf: (userId: string) => Promise<FriendshipRecord[]>
  // null unless id is a pending request addressed to addresseeId.
  acceptReceived: (id: string, addresseeId: string) => Promise<FriendshipRecord | null>
  // null unless userId is one of the two sides.
  deleteOf: (id: string, userId: string) => Promise<FriendshipRecord | null>
}

// P2002: a unique index refused the write. P2025: no record matched the filter.
type PrismaErrorCode = 'P2002' | 'P2025'

async function nullOnPrismaError<Result>(
  code: PrismaErrorCode,
  query: Promise<Result>,
): Promise<Result | null> {
  try {
    return await query
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === code) {
      return null
    }
    throw error
  }
}

// MongoDB cannot index "this pair in either order": sorted, the two ids make one key per pair.
function pairKeyOf(userId: string, otherUserId: string): string {
  return [userId, otherUserId].sort().join(':')
}

function eitherSide(userId: string): Prisma.FriendshipWhereInput[] {
  return [{ requesterId: userId }, { addresseeId: userId }]
}

function createPending(
  prisma: PrismaClient,
  { requesterId, addresseeId }: NewFriendship,
): Promise<FriendshipRecord | null> {
  const pairKey = pairKeyOf(requesterId, addresseeId)
  return nullOnPrismaError(
    'P2002',
    prisma.friendship.create({
      data: { requesterId, addresseeId, pairKey, status: 'pending' },
      include: WITH_PARTIES,
    }),
  )
}

// One atomic write: Prisma accepts the addressee and the status next to the unique id.
function acceptReceived(
  prisma: PrismaClient,
  id: string,
  addresseeId: string,
): Promise<FriendshipRecord | null> {
  return nullOnPrismaError(
    'P2025',
    prisma.friendship.update({
      where: { id, addresseeId, status: 'pending' },
      data: { status: 'accepted' },
      include: WITH_PARTIES,
    }),
  )
}

function deleteOf(
  prisma: PrismaClient,
  id: string,
  userId: string,
): Promise<FriendshipRecord | null> {
  return nullOnPrismaError(
    'P2025',
    prisma.friendship.delete({ where: { id, OR: eitherSide(userId) }, include: WITH_PARTIES }),
  )
}

export function createFriendshipsRepository(prisma: PrismaClient): FriendshipsRepository {
  return {
    findUserIdByEmail: async (email) => {
      const user = await prisma.user.findUnique({ where: { email }, select: { id: true } })
      return user?.id ?? null
    },
    findBetween: (userId, otherUserId) =>
      prisma.friendship.findUnique({
        where: { pairKey: pairKeyOf(userId, otherUserId) },
        include: WITH_PARTIES,
      }),
    create: (friendship) => createPending(prisma, friendship),
    // By id: an ObjectId starts with its creation time, so this is newest first.
    findAllOf: (userId) =>
      prisma.friendship.findMany({
        where: { OR: eitherSide(userId) },
        include: WITH_PARTIES,
        orderBy: { id: 'desc' },
      }),
    acceptReceived: (id, addresseeId) => acceptReceived(prisma, id, addresseeId),
    deleteOf: (id, userId) => deleteOf(prisma, id, userId),
  }
}
