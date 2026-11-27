import type { PrismaClient, User } from '@prisma/client'

export type UserRecord = User

export type AccountRepository = {
  findUserById: (id: string) => Promise<UserRecord | null>
  updateDisplayName: (id: string, displayName: string) => Promise<UserRecord>
  updatePasswordHash: (id: string, passwordHash: string) => Promise<void>
  deleteOtherSessions: (userId: string, keptSessionId: string) => Promise<number>
  updateAvatar: (id: string, avatarCloudinaryId: string | null) => Promise<UserRecord>
}

export function createAccountRepository(prisma: PrismaClient): AccountRepository {
  return {
    findUserById: (id) => prisma.user.findUnique({ where: { id } }),
    updateDisplayName: (id, displayName) =>
      prisma.user.update({ where: { id }, data: { displayName } }),
    updatePasswordHash: async (id, passwordHash) => {
      await prisma.user.update({ where: { id }, data: { passwordHash } })
    },
    // Returns how many were closed: the log tells how many devices must log in again.
    deleteOtherSessions: async (userId, keptSessionId) => {
      const { count } = await prisma.session.deleteMany({
        where: { userId, id: { not: keptSessionId } },
      })
      return count
    },
    updateAvatar: (id, avatarCloudinaryId) =>
      prisma.user.update({ where: { id }, data: { avatarCloudinaryId } }),
  }
}
