import { type Invitation, Prisma, type PrismaClient, type User } from '@prisma/client'

export type InvitationRecord = Invitation

export type UserRecord = User

export type NewInvitation = {
  tokenHash: string
  email: string
  invitedById: string
  expiresAt: Date
}

export type NewMember = { email: string; displayName: string; passwordHash: string }

export type InvitationsRepository = {
  hasUserWithEmail: (email: string) => Promise<boolean>
  // Pending or expired: a used invitation stays, it records a sign-up.
  deleteUnusedByEmail: (email: string) => Promise<number>
  create: (invitation: NewInvitation) => Promise<InvitationRecord>
  findAll: () => Promise<InvitationRecord[]>
  findByTokenHash: (tokenHash: string) => Promise<InvitationRecord | null>
  // null when the email already has an account: the service decides the error.
  createUser: (member: NewMember) => Promise<UserRecord | null>
  markUsed: (id: string, usedAt: Date) => Promise<void>
}

// P2002: the unique index on User.email refused a second account for the same address.
function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
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
    findByTokenHash: (tokenHash) => prisma.invitation.findUnique({ where: { tokenHash } }),
    // Here and not in the auth repository: an invitation is the only way to create an account.
    createUser: async (member) => {
      try {
        return await prisma.user.create({ data: { ...member, role: 'member' } })
      } catch (error: unknown) {
        if (isUniqueViolation(error)) {
          return null
        }
        throw error
      }
    },
    markUsed: async (id, usedAt) => {
      await prisma.invitation.update({ where: { id }, data: { usedAt } })
    },
  }
}
