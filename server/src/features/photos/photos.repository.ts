import type { Photo, PrismaClient } from '@prisma/client'

export type PhotoRecord = Photo

export type NewPhoto = { url: string; cloudinaryId: string; uploaderName: string }

export type PhotosRepository = {
  findLatest: (limit: number) => Promise<PhotoRecord[]>
  findById: (id: string) => Promise<PhotoRecord | null>
  create: (photo: NewPhoto) => Promise<PhotoRecord>
  deleteById: (id: string) => Promise<void>
}

export function createPhotosRepository(prisma: PrismaClient): PhotosRepository {
  return {
    findLatest: (limit) => prisma.photo.findMany({ orderBy: { createdAt: 'desc' }, take: limit }),
    findById: (id) => prisma.photo.findUnique({ where: { id } }),
    create: (photo) => prisma.photo.create({ data: photo }),
    deleteById: async (id) => {
      await prisma.photo.delete({ where: { id } })
    },
  }
}
