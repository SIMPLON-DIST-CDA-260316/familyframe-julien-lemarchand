import { type Photo, Prisma, type PrismaClient } from '@prisma/client'

// The sender's display name only: « Envoyée par X » needs nothing else of their account.
const SENDER_NAME = {
  sender: { select: { displayName: true } },
} satisfies Prisma.PhotoInclude

// A photo without its sender's name: what the service reads to check, copy or delete.
export type StoredPhoto = Photo

// sender is null for a photo its owner uploaded.
export type PhotoRecord = Prisma.PhotoGetPayload<{ include: typeof SENDER_NAME }>

// senderId and message only on a photo sent by a friend: Prisma leaves the fields out, and
// reads them as null.
export type NewPhoto = {
  ownerId: string
  senderId?: string
  message?: string
  isOpened: boolean
  url: string
  cloudinaryId: string
  sha256: string
}

export type PageQuery = { ownerId: string; beforeId: string | undefined; take: number }

export type PhotosRepository = {
  // Opened photos only: the library and the slideshow.
  findPage: (query: PageQuery) => Promise<PhotoRecord[]>
  // Photos friends sent that the owner has not opened yet, newest first.
  findUnopened: (ownerId: string) => Promise<PhotoRecord[]>
  findByOwnerAndSha256: (ownerId: string, sha256: string) => Promise<StoredPhoto | null>
  // null unless this owner has a photo with this id: someone else's answers like a missing one.
  findOwned: (id: string, ownerId: string) => Promise<StoredPhoto | null>
  // null when the owner already has this file: the service decides the error.
  create: (photo: NewPhoto) => Promise<PhotoRecord | null>
  deleteOwned: (id: string, ownerId: string) => Promise<StoredPhoto | null>
  // null unless this owner has a photo with this id, like findOwned.
  openOwned: (id: string, ownerId: string) => Promise<PhotoRecord | null>
  countByCloudinaryId: (cloudinaryId: string) => Promise<number>
}

// isOpened is unset on photos saved before step 9: they count as opened. Prisma's
// { not: false } would leave them out, it matches only a stored true or null.
export const IS_OPENED = {
  OR: [{ isOpened: true }, { isOpened: { isSet: false } }],
} satisfies Prisma.PhotoWhereInput

// P2025: no record matches: unknown, already deleted by another request, or someone else's.
function isRecordNotFound(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025'
}

// P2002: the unique index (ownerId, sha256) refused a second copy of the same file.
function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

async function createRecord(prisma: PrismaClient, photo: NewPhoto): Promise<PhotoRecord | null> {
  try {
    return await prisma.photo.create({ data: photo, include: SENDER_NAME })
  } catch (error: unknown) {
    if (isUniqueViolation(error)) {
      return null
    }
    throw error
  }
}

// One atomic query: Prisma accepts the owner next to the unique id.
async function deleteOwned(
  prisma: PrismaClient,
  id: string,
  ownerId: string,
): Promise<StoredPhoto | null> {
  try {
    return await prisma.photo.delete({ where: { id, ownerId } })
  } catch (error: unknown) {
    if (isRecordNotFound(error)) {
      return null
    }
    throw error
  }
}

// Same atomic query as deleteOwned. Opening twice changes nothing and answers the photo again.
async function openOwned(
  prisma: PrismaClient,
  id: string,
  ownerId: string,
): Promise<PhotoRecord | null> {
  try {
    return await prisma.photo.update({
      where: { id, ownerId },
      data: { isOpened: true },
      include: SENDER_NAME,
    })
  } catch (error: unknown) {
    if (isRecordNotFound(error)) {
      return null
    }
    throw error
  }
}

export function createPhotosRepository(prisma: PrismaClient): PhotosRepository {
  return {
    // Keyset on the id: an ObjectId starts with its creation time, so by id is newest
    // first, and "older than the cursor" is a single indexed range.
    findPage: ({ ownerId, beforeId, take }) =>
      prisma.photo.findMany({
        where: { ownerId, id: beforeId ? { lt: beforeId } : undefined, ...IS_OPENED },
        orderBy: { id: 'desc' },
        take,
        include: SENDER_NAME,
      }),
    findUnopened: (ownerId) =>
      prisma.photo.findMany({
        where: { ownerId, isOpened: false },
        orderBy: { id: 'desc' },
        include: SENDER_NAME,
      }),
    findByOwnerAndSha256: (ownerId, sha256) =>
      prisma.photo.findUnique({ where: { ownerId_sha256: { ownerId, sha256 } } }),
    findOwned: (id, ownerId) => prisma.photo.findFirst({ where: { id, ownerId } }),
    create: (photo) => createRecord(prisma, photo),
    deleteOwned: (id, ownerId) => deleteOwned(prisma, id, ownerId),
    openOwned: (id, ownerId) => openOwned(prisma, id, ownerId),
    countByCloudinaryId: (cloudinaryId) => prisma.photo.count({ where: { cloudinaryId } }),
  }
}
