import type { Prisma, PrismaClient, Send } from '@prisma/client'
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

export type SendsRepository = {
  create: (send: NewSend) => Promise<SendRecord>
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

export function createSendsRepository(prisma: PrismaClient): SendsRepository {
  return {
    create: (send) => create(prisma, send),
  }
}
