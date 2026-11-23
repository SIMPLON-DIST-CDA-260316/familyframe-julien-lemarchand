import type { Photo, PrismaClient } from '@prisma/client'

export type PhotoRecord = Photo

export type NewPhoto = { url: string; cloudinaryId: string; uploaderName: string }

export type PhotosRepository = {
  findLatest: (limit: number) => Promise<PhotoRecord[]>
  create: (photo: NewPhoto) => Promise<PhotoRecord>
}

export function createPhotosRepository(prisma: PrismaClient): PhotosRepository {
  return {
    findLatest: (limit) => prisma.photo.findMany({ orderBy: { createdAt: 'desc' }, take: limit }),
    create: (photo) => prisma.photo.create({ data: photo }),
  }
}
