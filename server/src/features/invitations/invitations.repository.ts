import type { Invitation, PrismaClient } from '@prisma/client'

export type InvitationRecord = Invitation

export type NewInvitation = {
  tokenHash: string
  email: string
  invitedById: string
  expiresAt: Date
}

export type InvitationsRepository = {
  hasUserWithEmail: (email: string) => Promise<boolean>
  // Pending or expired: a used invitation stays, it records a sign-up.
  deleteUnusedByEmail: (email: string) => Promise<number>
  create: (invitation: NewInvitation) => Promise<InvitationRecord>
  findAll: () => Promise<InvitationRecord[]>
}

export function createInvitationsRepository(prisma: PrismaClient): InvitationsRepository {
  return {
    hasUserWithEmail: async (email) => (await prisma.user.count({ where: { email } })) > 0,
    deleteUnusedByEmail: async (email) => {
      const { count } = await prisma.invitation.deleteMany({ where: { email, usedAt: null } })
      return count
    },
    // usedAt written on purpose: on MongoDB Prisma leaves an omitted optional field out of
    // the document, and the `usedAt: null` filter does not match a missing field.
    create: (invitation) => prisma.invitation.create({ data: { ...invitation, usedAt: null } }),
    // By id: an ObjectId starts with its creation time, so this is newest first.
    findAll: () => prisma.invitation.findMany({ orderBy: { id: 'desc' } }),
  }
}
