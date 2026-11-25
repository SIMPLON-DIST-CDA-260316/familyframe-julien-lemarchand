import type { PrismaClient } from '@prisma/client'
import { IS_OPENED } from '../photos/photos.repository.js'

// What a draw needs to know of a photo: never its image, its owner or its message.
export type SelectionPhoto = { id: string; createdAt: Date }

export type SelectionsRepository = {
  // The library: opened photos only, like GET /api/photos.
  findOpenedPhotos: (ownerId: string) => Promise<SelectionPhoto[]>
}

export function createSelectionsRepository(prisma: PrismaClient): SelectionsRepository {
  return {
    findOpenedPhotos: (ownerId) =>
      prisma.photo.findMany({
        where: { ownerId, ...IS_OPENED },
        select: { id: true, createdAt: true },
      }),
  }
}
