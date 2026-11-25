import type { PrismaClient } from '@prisma/client'
import { IS_OPENED } from '../photos/photos.repository.js'

// What a draw needs to know of a photo: never its image, its owner or its message. senderId is
// null for a photo its owner added.
export type SelectionPhoto = { id: string; createdAt: Date; senderId: string | null }

export type SelectionsRepository = {
  // The library: opened photos only, like GET /api/photos.
  findOpenedPhotos: (ownerId: string) => Promise<SelectionPhoto[]>
  // One list of photo ids per collection of the owner, deleted photos maybe included.
  findCollectionPhotoIds: (ownerId: string) => Promise<string[][]>
}

export function createSelectionsRepository(prisma: PrismaClient): SelectionsRepository {
  return {
    findOpenedPhotos: (ownerId) =>
      prisma.photo.findMany({
        where: { ownerId, ...IS_OPENED },
        select: { id: true, createdAt: true, senderId: true },
      }),
    findCollectionPhotoIds: async (ownerId) => {
      const collections = await prisma.collection.findMany({
        where: { ownerId },
        select: { photoIds: true },
      })
      return collections.map(({ photoIds }) => photoIds)
    },
  }
}
