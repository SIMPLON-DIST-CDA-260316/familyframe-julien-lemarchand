import { type Photo, Prisma, type PrismaClient } from '@prisma/client'

export type PhotoRecord = Photo

export type NewPhoto = { ownerId: string; url: string; cloudinaryId: string; sha256: string }

export type PageQuery = { ownerId: string; beforeId: string | undefined; take: number }

export type PhotosRepository = {
  findPage: (query: PageQuery) => Promise<PhotoRecord[]>
  findByOwnerAndSha256: (ownerId: string, sha256: string) => Promise<PhotoRecord | null>
  // null when the owner already has this file: the service decides the error.
  create: (photo: NewPhoto) => Promise<PhotoRecord | null>
  deleteOwned: (id: string, ownerId: string) => Promise<PhotoRecord | null>
  countByCloudinaryId: (cloudinaryId: string) => Promise<number>
}

// P2025: no record matches: unknown, already deleted by another request, or someone else's.
function isRecordNotFound(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025'
}

// P2002: the unique index (ownerId, sha256) refused a second copy of the same file.
function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

export function createPhotosRepository(prisma: PrismaClient): PhotosRepository {
  return {
    // Keyset on the id: an ObjectId starts with its creation time, so by id is newest
    // first, and "older than the cursor" is a single indexed range.
    findPage: ({ ownerId, beforeId, take }) =>
      prisma.photo.findMany({
        where: { ownerId, id: beforeId ? { lt: beforeId } : undefined },
        orderBy: { id: 'desc' },
        take,
      }),
    findByOwnerAndSha256: (ownerId, sha256) =>
      prisma.photo.findUnique({ where: { ownerId_sha256: { ownerId, sha256 } } }),
    create: async (photo) => {
      try {
        return await prisma.photo.create({ data: photo })
      } catch (error: unknown) {
        if (isUniqueViolation(error)) {
          return null
        }
        throw error
      }
    },
    // One atomic query: Prisma accepts the owner next to the unique id.
    deleteOwned: async (id, ownerId) => {
      try {
        return await prisma.photo.delete({ where: { id, ownerId } })
      } catch (error: unknown) {
        if (isRecordNotFound(error)) {
          return null
        }
        throw error
      }
    },
    countByCloudinaryId: (cloudinaryId) => prisma.photo.count({ where: { cloudinaryId } }),
  }
}
