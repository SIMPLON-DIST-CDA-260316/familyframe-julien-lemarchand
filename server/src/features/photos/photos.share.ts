import { AppError } from '../../errors/app-error.js'
import {
  OBJECT_ID_PATTERN,
  parseFile,
  parseMessage,
  parsePhotoId,
  type UploadedFile,
} from './photos.input.js'
import type { NewPhoto, PhotoRecord, StoredPhoto } from './photos.repository.js'
import type { PhotosServiceDeps } from './photos.service.js'
import { rejectKnownFile, storeNewPhoto } from './photos.store.js'

// photoId comes from the URL, friendId and message straight from the JSON body: validated here.
export type LibraryShare = {
  senderId: string
  photoId: string
  friendId: unknown
  message: unknown
}

// friendId and message are multipart text fields: validated here too.
export type DeviceShare = {
  senderId: string
  file: UploadedFile | undefined
  friendId: unknown
  message: unknown
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
export async function shareFromLibrary(
  deps: PhotosServiceDeps,
  { senderId, photoId, friendId, message }: LibraryShare,
): Promise<PhotoRecord> {
  const validPhotoId = parsePhotoId(photoId)
  const validMessage = parseMessage(message)
  const recipientId = await requireFriend(deps, friendId, senderId)
  const { id, url, cloudinaryId, sha256 } = await findOwnedPhoto(deps, validPhotoId, senderId)
  await rejectKnownFile(deps, recipientId, sha256)
  // The copy carries this sender's message, never the one the original came with.
  const record = await saveCopy(deps, {
    ownerId: recipientId,
    senderId,
    message: validMessage,
    isOpened: false,
    url,
    cloudinaryId,
    sha256,
  })
  deps.logger.info('photo.shared', {
    photoId: record.id,
    sourcePhotoId: id,
    cloudinaryId,
    userId: senderId,
    recipientId,
    source: 'library',
    hasMessage: validMessage !== undefined,
  })
  return record
}

// An upload with the friend as owner: converted and uploaded like any new photo.
export async function shareFromDevice(
  deps: PhotosServiceDeps,
  { senderId, file, friendId, message }: DeviceShare,
): Promise<PhotoRecord> {
  const { buffer } = parseFile(file)
  const validMessage = parseMessage(message)
  const recipientId = await requireFriend(deps, friendId, senderId)
  const upload = { ownerId: recipientId, senderId, message: validMessage, buffer }
  const record = await storeNewPhoto(deps, upload)
  deps.logger.info('photo.shared', {
    photoId: record.id,
    cloudinaryId: record.cloudinaryId,
    userId: senderId,
    recipientId,
    source: 'device',
    hasMessage: validMessage !== undefined,
  })
  return record
}
