import type { PrismaClient, User } from '@prisma/client'

export type UserRecord = User

export type AccountRepository = {
  updateDisplayName: (id: string, displayName: string) => Promise<UserRecord>
}

export function createAccountRepository(prisma: PrismaClient): AccountRepository {
  return {
    updateDisplayName: (id, displayName) =>
      prisma.user.update({ where: { id }, data: { displayName } }),
  }
}
