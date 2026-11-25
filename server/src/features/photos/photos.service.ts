import { AppError } from '../../errors/app-error.js'
import type { UploadedImage } from '../../lib/cloudinary.js'
import type { Logger } from '../../lib/logger.js'
import {
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
import { deleteStoredImage, storeNewPhoto } from './photos.store.js'

// ownerId is the logged-in account: a photo belongs to whoever uploaded it.
export type NewPhotoInput = { ownerId: string; file: UploadedFile | undefined }

export type PhotoDeletion = { ownerId: string; id: string }

// cursor and limit come straight from the query string: validated here, at the boundary.
export type PageInput = { ownerId: string; cursor: unknown; limit: unknown }

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
  // Returns the friend's new photo: the controller sends it to the friend's room.
  shareFromLibrary: (share: LibraryShare) => Promise<PhotoRecord>
  // The file lands in the friend's library only, not in the sender's.
  shareFromDevice: (share: DeviceShare) => Promise<PhotoRecord>
}

// A shared photo points to the same image: it goes with the last photo using it.
// Counted after the deletion, so the deleted photo does not count itself.
async function destroyUnusedImage(deps: PhotosServiceDeps, cloudinaryId: string): Promise<boolean> {
  let remainingCount: number
  try {
    remainingCount = await deps.repository.countByCloudinaryId(cloudinaryId)
  } catch (error: unknown) {
    // The record is gone and without the count we cannot tell whether another photo
    // still uses the image, so we keep it and log it.
    deps.logger.error('photo.orphaned', { cloudinaryId, error })
    return false
  }
  if (remainingCount > 0) {
    return false
  }
  return deleteStoredImage(deps, cloudinaryId)
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
  const isImageDestroyed = await destroyUnusedImage(deps, record.cloudinaryId)
  deps.logger.info('photo.deleted', {
    photoId: record.id,
    cloudinaryId: record.cloudinaryId,
    userId: ownerId,
    isImageDestroyed,
  })
  return record.id
}

// One record more than asked tells whether a next page exists, without a count query.
async function listPage(
  { repository }: PhotosServiceDeps,
  { ownerId, cursor, limit }: PageInput,
): Promise<RecordPage> {
  const pageSize = parseLimit(limit)
  const beforeId = parseCursor(cursor)
  const records = await repository.findPage({ ownerId, beforeId, take: pageSize + 1 })
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
    shareFromLibrary: (share) => shareFromLibrary(deps, share),
    shareFromDevice: (share) => shareFromDevice(deps, share),
  }
}
