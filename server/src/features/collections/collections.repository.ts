import { type Collection, Prisma, type PrismaClient } from '@prisma/client'
import { IS_OPENED } from '../photos/photos.repository.js'

export type CollectionRecord = Collection

// What a collection shows of its photos: the cover and the dates.
export type LivePhoto = { id: string; cloudinaryId: string; createdAt: Date }

// Why a write found nothing to change: the service turns it into the error code.
export type WriteRefusal = 'not_found' | 'name_taken'

export type CollectionsRepository = {
  findAllOf: (ownerId: string) => Promise<CollectionRecord[]>
  // Among ids, the photos still in the owner's library: a deleted photo stays in photoIds.
  findLivePhotos: (ownerId: string, ids: string[]) => Promise<LivePhoto[]>
  create: (ownerId: string, name: string) => Promise<CollectionRecord | WriteRefusal>
  rename: (id: string, ownerId: string, name: string) => Promise<CollectionRecord | WriteRefusal>
  // null unless id is one of ownerId's collections.
  deleteOwned: (id: string, ownerId: string) => Promise<CollectionRecord | null>
  findOwned: (id: string, ownerId: string) => Promise<CollectionRecord | null>
  // A received photo joins a collection only once opened, like it joins the library.
  hasOpenedPhoto: (ownerId: string, photoId: string) => Promise<boolean>
  // null unless id is one of ownerId's collections without photoId yet.
  addPhoto: (id: string, ownerId: string, photoId: string) => Promise<CollectionRecord | null>
  // null unless id is one of ownerId's collections and its list is still readIds.
  setPhotoIds: (
    id: string,
    ownerId: string,
    readIds: string[],
    photoIds: string[],
  ) => Promise<CollectionRecord | null>
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

function findLivePhotos(
  prisma: PrismaClient,
  ownerId: string,
  ids: string[],
): Promise<LivePhoto[]> {
  return prisma.photo.findMany({
    where: { ownerId, id: { in: ids } },
    select: { id: true, cloudinaryId: true, createdAt: true },
  })
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

// One atomic write: the filter refuses a photo already in, so two clicks never add it twice.
function addPhoto(
  prisma: PrismaClient,
  id: string,
  ownerId: string,
  photoId: string,
): Promise<CollectionRecord | null> {
  return nullWhenNotFound(
    prisma.collection.update({
      where: { id, ownerId, NOT: { photoIds: { has: photoId } } },
      data: { photoIds: { push: photoId } },
    }),
  )
}

type PhotoIdsWrite = { id: string; ownerId: string; readIds: string[]; photoIds: string[] }

// A list changed since it was read (an add from another device) is not overwritten.
function setPhotoIds(
  prisma: PrismaClient,
  { id, ownerId, readIds, photoIds }: PhotoIdsWrite,
): Promise<CollectionRecord | null> {
  return nullWhenNotFound(
    prisma.collection.update({
      where: { id, ownerId, photoIds: { equals: readIds } },
      data: { photoIds: { set: photoIds } },
    }),
  )
}

export function createCollectionsRepository(prisma: PrismaClient): CollectionsRepository {
  return {
    findAllOf: (ownerId) => prisma.collection.findMany({ where: { ownerId } }),
    findLivePhotos: (ownerId, ids) => findLivePhotos(prisma, ownerId, ids),
    // photoIds: [] written for real: a missing field would never match « does not have ».
    create: (ownerId, name) =>
      refusalOnPrismaError(prisma.collection.create({ data: { ownerId, name, photoIds: [] } })),
    // The owner next to the unique id: someone else's collection is not found.
    rename: (id, ownerId, name) =>
      refusalOnPrismaError(prisma.collection.update({ where: { id, ownerId }, data: { name } })),
    deleteOwned: (id, ownerId) =>
      nullWhenNotFound(prisma.collection.delete({ where: { id, ownerId } })),
    findOwned: (id, ownerId) => prisma.collection.findFirst({ where: { id, ownerId } }),
    hasOpenedPhoto: async (ownerId, photoId) => {
      const photo = await prisma.photo.findFirst({
        where: { id: photoId, ownerId, ...IS_OPENED },
        select: { id: true },
      })
      return photo !== null
    },
    addPhoto: (id, ownerId, photoId) => addPhoto(prisma, id, ownerId, photoId),
    setPhotoIds: (id, ownerId, readIds, photoIds) =>
      setPhotoIds(prisma, { id, ownerId, readIds, photoIds }),
  }
}
