import { createHash } from 'node:crypto'
import { AppError } from '../../errors/app-error.js'
import type { UploadedImage } from '../../lib/cloudinary.js'
import type { NewPhoto, PhotoRecord } from './photos.repository.js'
import type { PhotosServiceDeps } from './photos.service.js'

export type NewUpload = { ownerId: string; buffer: Buffer }

// The original bytes, before sharp: its output is not guaranteed to be stable.
export function sha256Of(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

// Saves the sharp and Cloudinary work for a known file; the unique index is the real guarantee.
export async function rejectKnownFile(
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
export async function deleteStoredImage(
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

// The same steps for an upload to one's own library and for a file sent to friends.
export async function uploadFrameImage(
  deps: PhotosServiceDeps,
  buffer: Buffer,
): Promise<UploadedImage> {
  const jpeg = await convertToFrameJpeg(deps, buffer)
  // Cloudinary and database failures are ours: they stay 500s.
  return deps.uploadImage(jpeg)
}

// From the received bytes to a saved photo of ownerId. A photo one adds oneself is already seen.
export async function storeNewPhoto(
  deps: PhotosServiceDeps,
  { ownerId, buffer }: NewUpload,
): Promise<PhotoRecord> {
  const sha256 = sha256Of(buffer)
  await rejectKnownFile(deps, ownerId, sha256)
  const image = await uploadFrameImage(deps, buffer)
  return saveRecord(deps, { ownerId, isOpened: true, ...image, sha256 })
}
