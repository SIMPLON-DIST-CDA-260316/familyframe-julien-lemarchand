import type { Role } from '@prisma/client'
import { prisma } from '../src/lib/db.js'
import { logger } from '../src/lib/logger.js'
import { hashPassword } from '../src/lib/password.js'

type SeedUser = { email: string; displayName: string; role: Role; password: string }

// Development only: these passwords are public (README, Bruno environment).
const SEED_USERS: SeedUser[] = [
  {
    email: 'admin@familyframe.test',
    displayName: 'Admin',
    role: 'admin',
    password: 'admin-familyframe-dev',
  },
  {
    email: 'membre@familyframe.test',
    displayName: 'Membre',
    role: 'member',
    password: 'membre-familyframe-dev',
  },
]

async function seed(): Promise<void> {
  // Sessions, photos and invitations first: Prisma emulates the relations on MongoDB
  // and refuses to delete a user that still has any of them.
  await prisma.session.deleteMany()
  await prisma.photo.deleteMany()
  await prisma.invitation.deleteMany()
  await prisma.user.deleteMany()
  for (const { password, ...user } of SEED_USERS) {
    await prisma.user.create({ data: { ...user, passwordHash: await hashPassword(password) } })
  }
  // The count only: the credentials never reach the logs.
  logger.info('seed.done', { users: SEED_USERS.length })
}

// The seed wipes the database: a production database must never meet it.
if (process.env.NODE_ENV === 'production') {
  logger.error('seed.refused')
  process.exit(1)
}

try {
  await seed()
} finally {
  await prisma.$disconnect()
}
