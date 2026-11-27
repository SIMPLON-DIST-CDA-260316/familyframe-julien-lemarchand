import { Prisma, type PrismaClient, type Send } from '@prisma/client'
import { countImageUses } from '../../lib/image-uses.js'
import type { SendRecipient } from '../../types.js'

// The name only: a history line says who, not how to reach them.
const RECIPIENT_FIELDS = { id: true, displayName: true } satisfies Prisma.UserSelect

// message only when the sender wrote one: Prisma leaves the field out, and reads it as null.
export type NewSend = {
  senderId: string
  recipientIds: string[]
  url: string
  cloudinaryId: string
  message?: string
}

// recipients in the order they were sent to; an account that no longer exists drops out.
export type SendRecord = Send & { recipients: SendRecipient[] }

// beforeId: the cursor, the last id of the previous page; undefined for the first page.
export type SendPageQuery = { senderId: string; beforeId: string | undefined; take: number }

export type SendsRepository = {
  create: (send: NewSend) => Promise<SendRecord>
  // Newest first: ObjectIds grow with time.
  findPage: (query: SendPageQuery) => Promise<SendRecord[]>
  // null unless this sender has a send with this id: someone else's answers like a missing one.
  deleteOwned: (id: string, senderId: string) => Promise<Send | null>
  // Photos and history lines: the image stays while one of them uses it.
  countImageUses: (cloudinaryId: string) => Promise<number>
}

// One query for every line: names are read now, never copied into the send.
async function withRecipients(prisma: PrismaClient, sends: Send[]): Promise<SendRecord[]> {
  const ids = [...new Set(sends.flatMap(({ recipientIds }) => recipientIds))]
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: RECIPIENT_FIELDS })
  const userById = new Map(users.map((user) => [user.id, user]))
  return sends.map((send) => ({
    ...send,
    recipients: send.recipientIds.flatMap((id) => userById.get(id) ?? []),
  }))
}

async function create(prisma: PrismaClient, send: NewSend): Promise<SendRecord> {
  const record = await prisma.send.create({ data: send })
  const [named] = await withRecipients(prisma, [record])
  return named
}

async function findPage(
  prisma: PrismaClient,
  { senderId, beforeId, take }: SendPageQuery,
): Promise<SendRecord[]> {
  const sends = await prisma.send.findMany({
    where: { senderId, id: { lt: beforeId } },
    orderBy: { id: 'desc' },
    take,
  })
  return withRecipients(prisma, sends)
}

// P2025: no record matches: unknown, already removed by another request, or someone else's.
async function deleteOwned(
  prisma: PrismaClient,
  id: string,
  senderId: string,
): Promise<Send | null> {
  try {
    return await prisma.send.delete({ where: { id, senderId } })
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return null
    }
    throw error
  }
}

export function createSendsRepository(prisma: PrismaClient): SendsRepository {
  return {
    create: (send) => create(prisma, send),
    findPage: (query) => findPage(prisma, query),
    deleteOwned: (id, senderId) => deleteOwned(prisma, id, senderId),
    countImageUses: (cloudinaryId) => countImageUses(prisma, cloudinaryId),
  }
}
