import { AppError } from '../../errors/app-error.js'
import type { UploadedImage } from '../../lib/cloudinary.js'
import { destroyUnusedImage } from '../../lib/image-uses.js'
import type { Logger } from '../../lib/logger.js'
import {
  parseCollectionFilter,
  parseCursor,
  parseFile,
  parseLimit,
  parsePhotoId,
  type UploadedFile,
} from './photos.input.js'
import type { PhotoRecord, PhotosRepository } from './photos.repository.js'
import {
  type DeviceShare,
  type LibraryShare,
  shareFromDevice,
  shareFromLibrary,
} from './photos.share.js'
import { storeNewPhoto } from './photos.store.js'

// ownerId is the logged-in account: a photo belongs to whoever uploaded it.
export type NewPhotoInput = { ownerId: string; file: UploadedFile | undefined }

export type PhotoDeletion = { ownerId: string; id: string }

// id comes straight from the URL: validated here.
export type PhotoOpening = { ownerId: string; id: string }

// cursor, limit and collectionId come straight from the query string: validated here, at the
// boundary.
export type PageInput = {
  ownerId: string
  cursor: unknown
  limit: unknown
  collectionId: unknown
}

export type RecordPage = { records: PhotoRecord[]; nextCursor: string | null }

export type PhotosServiceDeps = {
  repository: PhotosRepository
  toFrameJpeg: (input: Buffer) => Promise<Buffer>
  uploadImage: (jpeg: Buffer) => Promise<UploadedImage>
  deleteImage: (cloudinaryId: string) => Promise<void>
  // The friendships service's rule: a photo goes only to an accepted friend.
  areFriends: (userId: string, otherUserId: string) => Promise<boolean>
  logger: Logger
}

export type PhotosService = {
  listPage: (input: PageInput) => Promise<RecordPage>
  createPhoto: (input: NewPhotoInput) => Promise<PhotoRecord>
  deletePhoto: (deletion: PhotoDeletion) => Promise<string>
  listUnopened: (ownerId: string) => Promise<PhotoRecord[]>
  // The opened photo joins the library: the controller sends it to the owner's room.
  openPhoto: (opening: PhotoOpening) => Promise<PhotoRecord>
  // Returns the friend's new photo: the controller sends it to the friend's room.
  shareFromLibrary: (share: LibraryShare) => Promise<PhotoRecord>
  // The file lands in the friend's library only, not in the sender's.
  shareFromDevice: (share: DeviceShare) => Promise<PhotoRecord>
}

// The image stays while another photo or a send uses it.
function destroyImageIfUnused(deps: PhotosServiceDeps, cloudinaryId: string): Promise<boolean> {
  const { repository, deleteImage, logger } = deps
  return destroyUnusedImage(
    { countImageUses: repository.countImageUses, deleteImage, logger },
    cloudinaryId,
  )
}

async function createPhoto(
  deps: PhotosServiceDeps,
  { ownerId, file }: NewPhotoInput,
): Promise<PhotoRecord> {
  const { buffer } = parseFile(file)
  const record = await storeNewPhoto(deps, { ownerId, buffer })
  deps.logger.info('photo.created', {
    photoId: record.id,
    cloudinaryId: record.cloudinaryId,
    userId: ownerId,
  })
  return record
}

// Database first: it decides what the frame shows.
// Returns the stored id: the one in the URL may differ in case.
async function deletePhoto(
  deps: PhotosServiceDeps,
  { ownerId, id }: PhotoDeletion,
): Promise<string> {
  // Someone else's photo answers like a missing one: its existence does not leak.
  const record = await deps.repository.deleteOwned(parsePhotoId(id), ownerId)
  if (!record) {
    throw new AppError('PHOTO_NOT_FOUND')
  }
  const isImageDestroyed = await destroyImageIfUnused(deps, record.cloudinaryId)
  deps.logger.info('photo.deleted', {
    photoId: record.id,
    cloudinaryId: record.cloudinaryId,
    userId: ownerId,
    isImageDestroyed,
  })
  return record.id
}

// Someone else's photo answers like a missing one, as for a deletion.
async function openPhoto(
  { repository, logger }: PhotosServiceDeps,
  { ownerId, id }: PhotoOpening,
): Promise<PhotoRecord> {
  const record = await repository.openOwned(parsePhotoId(id), ownerId)
  if (!record) {
    throw new AppError('PHOTO_NOT_FOUND')
  }
  logger.info('photo.opened', { photoId: record.id, userId: ownerId })
  return record
}

// undefined: the whole library. Someone else's collection answers like a missing one.
async function findFilterPhotoIds(
  repository: PhotosRepository,
  ownerId: string,
  collectionId: string | undefined,
): Promise<string[] | undefined> {
  if (collectionId === undefined) {
    return undefined
  }
  const photoIds = await repository.findCollectionPhotoIds(collectionId, ownerId)
  if (photoIds === null) {
    throw new AppError('COLLECTION_NOT_FOUND')
  }
  return photoIds
}

// One record more than asked tells whether a next page exists, without a count query.
async function listPage(
  { repository }: PhotosServiceDeps,
  { ownerId, cursor, limit, collectionId }: PageInput,
): Promise<RecordPage> {
  const pageSize = parseLimit(limit)
  const beforeId = parseCursor(cursor)
  const filterId = parseCollectionFilter(collectionId)
  const photoIds = await findFilterPhotoIds(repository, ownerId, filterId)
  const records = await repository.findPage({ ownerId, beforeId, take: pageSize + 1, photoIds })
  if (records.length <= pageSize) {
    return { records, nextCursor: null }
  }
  const pageRecords = records.slice(0, pageSize)
  return { records: pageRecords, nextCursor: pageRecords[pageRecords.length - 1].id }
}

export function createPhotosService(deps: PhotosServiceDeps): PhotosService {
  return {
    listPage: (input) => listPage(deps, input),
    createPhoto: (input) => createPhoto(deps, input),
    deletePhoto: (deletion) => deletePhoto(deps, deletion),
    listUnopened: (ownerId) => deps.repository.findUnopened(ownerId),
    openPhoto: (opening) => openPhoto(deps, opening),
    shareFromLibrary: (share) => shareFromLibrary(deps, share),
    shareFromDevice: (share) => shareFromDevice(deps, share),
  }
}
