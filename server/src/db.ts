import { PrismaClient } from '@prisma/client'

// One client for the whole app: it holds the connection pool to MongoDB.
export const prisma = new PrismaClient()
