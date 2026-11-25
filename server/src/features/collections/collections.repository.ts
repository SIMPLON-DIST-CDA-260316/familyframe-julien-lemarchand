import { type Collection, Prisma, type PrismaClient } from '@prisma/client'

export type CollectionRecord = Collection

// Why a write found nothing to change: the service turns it into the error code.
export type WriteRefusal = 'not_found' | 'name_taken'

export type CollectionsRepository = {
  findAllOf: (ownerId: string) => Promise<CollectionRecord[]>
  // Among ids, the ones still in the owner's library: a deleted photo stays in photoIds.
  findLivePhotoIds: (ownerId: string, ids: string[]) => Promise<string[]>
  create: (ownerId: string, name: string) => Promise<CollectionRecord | WriteRefusal>
  rename: (id: string, ownerId: string, name: string) => Promise<CollectionRecord | WriteRefusal>
  // null unless id is one of ownerId's collections.
  deleteOwned: (id: string, ownerId: string) => Promise<CollectionRecord | null>
}

// P2002: the unique (ownerId, name) index refused the write. P2025: no record matched.
function toRefusal(error: unknown): WriteRefusal {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return 'name_taken'
    }
    if (error.code === 'P2025') {
      return 'not_found'
    }
  }
  throw error
}

async function refusalOnPrismaError(
  query: Promise<CollectionRecord>,
): Promise<CollectionRecord | WriteRefusal> {
  try {
    return await query
  } catch (error: unknown) {
    return toRefusal(error)
  }
}

async function findLivePhotoIds(
  prisma: PrismaClient,
  ownerId: string,
  ids: string[],
): Promise<string[]> {
  const photos = await prisma.photo.findMany({
    where: { ownerId, id: { in: ids } },
    select: { id: true },
  })
  return photos.map((photo) => photo.id)
}

async function nullWhenNotFound(
  query: Promise<CollectionRecord>,
): Promise<CollectionRecord | null> {
  try {
    return await query
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return null
    }
    throw error
  }
}

export function createCollectionsRepository(prisma: PrismaClient): CollectionsRepository {
  return {
    findAllOf: (ownerId) => prisma.collection.findMany({ where: { ownerId } }),
    findLivePhotoIds: (ownerId, ids) => findLivePhotoIds(prisma, ownerId, ids),
    // photoIds: [] written for real: a missing field would never match « does not have ».
    create: (ownerId, name) =>
      refusalOnPrismaError(prisma.collection.create({ data: { ownerId, name, photoIds: [] } })),
    // The owner next to the unique id: someone else's collection is not found.
    rename: (id, ownerId, name) =>
      refusalOnPrismaError(prisma.collection.update({ where: { id, ownerId }, data: { name } })),
    deleteOwned: (id, ownerId) =>
      nullWhenNotFound(prisma.collection.delete({ where: { id, ownerId } })),
  }
}
