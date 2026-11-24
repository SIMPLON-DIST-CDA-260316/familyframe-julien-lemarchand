import { type Photo, Prisma, type PrismaClient } from '@prisma/client'

export type PhotoRecord = Photo

export type NewPhoto = { ownerId: string; url: string; cloudinaryId: string }

export type PhotosRepository = {
  findLatest: (ownerId: string, limit: number) => Promise<PhotoRecord[]>
  create: (photo: NewPhoto) => Promise<PhotoRecord>
  deleteOwned: (id: string, ownerId: string) => Promise<PhotoRecord | null>
}

// P2025: no record matches: unknown, already deleted by another request, or someone else's.
function isRecordNotFound(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025'
}

export function createPhotosRepository(prisma: PrismaClient): PhotosRepository {
  return {
    // An ObjectId starts with its creation time: by id is newest first.
    findLatest: (ownerId, limit) =>
      prisma.photo.findMany({ where: { ownerId }, orderBy: { id: 'desc' }, take: limit }),
    create: (photo) => prisma.photo.create({ data: photo }),
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
  }
}
