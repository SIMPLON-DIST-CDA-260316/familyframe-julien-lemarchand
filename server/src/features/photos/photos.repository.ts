import { type Photo, Prisma, type PrismaClient } from '@prisma/client'

export type PhotoRecord = Photo

export type NewPhoto = { url: string; cloudinaryId: string; uploaderName: string }

export type PhotosRepository = {
  findLatest: (limit: number) => Promise<PhotoRecord[]>
  create: (photo: NewPhoto) => Promise<PhotoRecord>
  deleteById: (id: string) => Promise<PhotoRecord | null>
}

// P2025: no record to delete, also when another request deleted it first.
function isRecordNotFound(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025'
}

export function createPhotosRepository(prisma: PrismaClient): PhotosRepository {
  return {
    findLatest: (limit) => prisma.photo.findMany({ orderBy: { createdAt: 'desc' }, take: limit }),
    create: (photo) => prisma.photo.create({ data: photo }),
    deleteById: async (id) => {
      try {
        return await prisma.photo.delete({ where: { id } })
      } catch (error: unknown) {
        if (isRecordNotFound(error)) {
          return null
        }
        throw error
      }
    },
  }
}
