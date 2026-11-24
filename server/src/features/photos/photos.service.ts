import { createHash } from 'node:crypto'
import { AppError } from '../../errors/app-error.js'
import type { UploadedImage } from '../../lib/cloudinary.js'
import type { Logger } from '../../lib/logger.js'
import {
  OBJECT_ID_PATTERN,
  parseCursor,
  parseFile,
  parseLimit,
  parsePhotoId,
  type UploadedFile,
} from './photos.input.js'
import type { NewPhoto, PhotoRecord, PhotosRepository, StoredPhoto } from './photos.repository.js'

// ownerId is the logged-in account: a photo belongs to whoever uploaded it.
export type NewPhotoInput = { ownerId: string; file: UploadedFile | undefined }

// senderId only when the file goes to a friend's library.
type NewUpload = { ownerId: string; senderId?: string; buffer: Buffer }

export type PhotoDeletion = { ownerId: string; id: string }

// photoId comes from the URL, friendId straight from the JSON body: validated here.
export type LibraryShare = { senderId: string; photoId: string; friendId: unknown }

// friendId is a multipart text field: validated here too.
export type DeviceShare = { senderId: string; file: UploadedFile | undefined; friendId: unknown }

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

// The original bytes, before sharp: its output is not guaranteed to be stable.
function sha256Of(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

// Saves the sharp and Cloudinary work for a known file; the unique index is the real guarantee.
async function rejectKnownFile(
  { repository, logger }: PhotosServiceDeps,
  ownerId: string,
  sha256: string,
): Promise<void> {
  const existing = await repository.findByOwnerAndSha256(ownerId, sha256)
  if (existing) {
    logger.info('photo.duplicate', { userId: ownerId, photoId: existing.id })
    throw new AppError('PHOTO_DUPLICATE')
  }
}

async function convertToFrameJpeg(
  { toFrameJpeg, logger }: PhotosServiceDeps,
  input: Buffer,
): Promise<Buffer> {
  try {
    return await toFrameJpeg(input)
  } catch (error: unknown) {
    logger.warn('photo.unreadable', { error })
    throw new AppError('IMAGE_UNREADABLE')
  }
}

// true once Cloudinary destroyed the image. The record is gone, or was never saved:
// a Cloudinary failure only leaves an orphan image, so the caller still goes on.
async function deleteStoredImage(
  { deleteImage, logger }: PhotosServiceDeps,
  cloudinaryId: string,
): Promise<boolean> {
  try {
    await deleteImage(cloudinaryId)
    return true
  } catch (error: unknown) {
    logger.error('photo.orphaned', { cloudinaryId, error })
    return false
  }
}

async function insertRecord(
  { repository, logger }: PhotosServiceDeps,
  photo: NewPhoto,
): Promise<PhotoRecord | null> {
  try {
    return await repository.create(photo)
  } catch (error: unknown) {
    // The image is on Cloudinary with no record pointing to it: its id is needed to clean up.
    logger.error('photo.orphaned', { cloudinaryId: photo.cloudinaryId, error })
    throw error
  }
}

async function saveRecord(deps: PhotosServiceDeps, photo: NewPhoto): Promise<PhotoRecord> {
  const record = await insertRecord(deps, photo)
  if (record) {
    return record
  }
  // A concurrent upload of the same file won: this new image is referenced by nothing.
  await deleteStoredImage(deps, photo.cloudinaryId)
  deps.logger.info('photo.duplicate', { userId: photo.ownerId, cloudinaryId: photo.cloudinaryId })
  throw new AppError('PHOTO_DUPLICATE')
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

// From the received bytes to a saved photo of ownerId: the same steps for an upload to
// one's own library and for a file sent to a friend.
async function storeNewPhoto(
  deps: PhotosServiceDeps,
  { ownerId, senderId, buffer }: NewUpload,
): Promise<PhotoRecord> {
  const sha256 = sha256Of(buffer)
  await rejectKnownFile(deps, ownerId, sha256)
  const jpeg = await convertToFrameJpeg(deps, buffer)
  // Cloudinary and database failures are ours: they stay 500s.
  const image = await deps.uploadImage(jpeg)
  return saveRecord(deps, { ownerId, senderId, ...image, sha256 })
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

// Missing, malformed, unknown, pending or oneself: one answer, the id is no accepted friend's.
// A malformed id never reaches the database: Prisma would fail on it.
async function requireFriend(
  { areFriends, logger }: PhotosServiceDeps,
  friendId: unknown,
  senderId: string,
): Promise<string> {
  const isObjectId = typeof friendId === 'string' && OBJECT_ID_PATTERN.test(friendId)
  if (isObjectId && (await areFriends(senderId, friendId))) {
    return friendId
  }
  logger.warn('photo.share_refused', { reason: 'not_friends', userId: senderId })
  throw new AppError('NOT_FRIENDS')
}

async function findOwnedPhoto(
  { repository }: PhotosServiceDeps,
  id: string,
  ownerId: string,
): Promise<StoredPhoto> {
  const photo = await repository.findOwned(id, ownerId)
  if (!photo) {
    throw new AppError('PHOTO_NOT_FOUND')
  }
  return photo
}

// A concurrent share of the same file won. Unlike a fresh upload, the image stays:
// the original photo still uses it.
async function saveCopy(deps: PhotosServiceDeps, photo: NewPhoto): Promise<PhotoRecord> {
  const record = await deps.repository.create(photo)
  if (record) {
    return record
  }
  deps.logger.info('photo.duplicate', { userId: photo.ownerId, cloudinaryId: photo.cloudinaryId })
  throw new AppError('PHOTO_DUPLICATE')
}

// The friend gets a new photo pointing to the same Cloudinary image: nothing is uploaded again.
async function shareFromLibrary(
  deps: PhotosServiceDeps,
  { senderId, photoId, friendId }: LibraryShare,
): Promise<PhotoRecord> {
  const validPhotoId = parsePhotoId(photoId)
  const recipientId = await requireFriend(deps, friendId, senderId)
  const { id, url, cloudinaryId, sha256 } = await findOwnedPhoto(deps, validPhotoId, senderId)
  await rejectKnownFile(deps, recipientId, sha256)
  const record = await saveCopy(deps, { ownerId: recipientId, senderId, url, cloudinaryId, sha256 })
  deps.logger.info('photo.shared', {
    photoId: record.id,
    sourcePhotoId: id,
    cloudinaryId,
    userId: senderId,
    recipientId,
    source: 'library',
  })
  return record
}

// An upload with the friend as owner: converted and uploaded like any new photo.
async function shareFromDevice(
  deps: PhotosServiceDeps,
  { senderId, file, friendId }: DeviceShare,
): Promise<PhotoRecord> {
  const { buffer } = parseFile(file)
  const recipientId = await requireFriend(deps, friendId, senderId)
  const record = await storeNewPhoto(deps, { ownerId: recipientId, senderId, buffer })
  deps.logger.info('photo.shared', {
    photoId: record.id,
    cloudinaryId: record.cloudinaryId,
    userId: senderId,
    recipientId,
    source: 'device',
  })
  return record
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
