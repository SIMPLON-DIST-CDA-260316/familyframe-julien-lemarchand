import type { PrismaClient, Session, User } from '@prisma/client'

export type UserRecord = User

export type SessionWithUser = Session & { user: User }

export type NewSession = { tokenHash: string; userId: string; expiresAt: Date }

export type AuthRepository = {
  findUserByEmail: (email: string) => Promise<UserRecord | null>
  findSessionByTokenHash: (tokenHash: string) => Promise<SessionWithUser | null>
  createSession: (session: NewSession) => Promise<void>
  extendSession: (id: string, expiresAt: Date) => Promise<void>
  deleteSession: (id: string) => Promise<void>
  deleteExpiredSessions: (now: Date) => Promise<void>
}

export function createAuthRepository(prisma: PrismaClient): AuthRepository {
  return {
    findUserByEmail: (email) => prisma.user.findUnique({ where: { email } }),
    findSessionByTokenHash: (tokenHash) =>
      prisma.session.findUnique({ where: { tokenHash }, include: { user: true } }),
    createSession: async (session) => {
      await prisma.session.create({ data: session })
    },
    // The many variants: a session already deleted by a concurrent logout is not an error.
    extendSession: async (id, expiresAt) => {
      await prisma.session.updateMany({ where: { id }, data: { expiresAt } })
    },
    deleteSession: async (id) => {
      await prisma.session.deleteMany({ where: { id } })
    },
    deleteExpiredSessions: async (now) => {
      await prisma.session.deleteMany({ where: { expiresAt: { lte: now } } })
    },
  }
}
