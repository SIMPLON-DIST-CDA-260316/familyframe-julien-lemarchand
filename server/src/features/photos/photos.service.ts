import { AppError } from '../../errors/app-error.js'
import type { UploadedImage } from '../../lib/cloudinary.js'
import type { Logger } from '../../lib/logger.js'
import type { NewPhoto, PhotoRecord, PhotosRepository } from './photos.repository.js'

const LATEST_PHOTOS_LIMIT = 20
const ALLOWED_TYPES: string[] = ['image/jpeg', 'image/png', 'image/webp']
const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i

export type UploadedFile = { buffer: Buffer; mimetype: string }

// ownerId is the logged-in account: a photo belongs to whoever uploaded it.
export type NewPhotoInput = { ownerId: string; file: UploadedFile | undefined }

export type PhotoDeletion = { ownerId: string; id: string }

export type PhotosServiceDeps = {
  repository: PhotosRepository
  toFrameJpeg: (input: Buffer) => Promise<Buffer>
  uploadImage: (jpeg: Buffer) => Promise<UploadedImage>
  deleteImage: (cloudinaryId: string) => Promise<void>
  logger: Logger
}

export type PhotosService = {
  listLatest: (ownerId: string) => Promise<PhotoRecord[]>
  createPhoto: (input: NewPhotoInput) => Promise<PhotoRecord>
  deletePhoto: (deletion: PhotoDeletion) => Promise<string>
}

function parseFile(file: UploadedFile | undefined): UploadedFile {
  if (!file) {
    throw new AppError('PHOTO_MISSING')
  }
  // Cheap first filter: the browser's mimetype can lie, sharp checks for real.
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    throw new AppError('FORMAT_UNSUPPORTED')
  }
  return file
}

// Prisma fails on an id that is not an ObjectId: that would be a 500, not a 404.
function parsePhotoId(id: string): string {
  if (!OBJECT_ID_PATTERN.test(id)) {
    throw new AppError('PHOTO_NOT_FOUND')
  }
  return id
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

async function saveRecord(
  { repository, logger }: PhotosServiceDeps,
  photo: NewPhoto,
): Promise<PhotoRecord> {
  try {
    return await repository.create(photo)
  } catch (error: unknown) {
    // The image is on Cloudinary with no record pointing to it: its id is needed to clean up.
    logger.error('photo.orphaned', { cloudinaryId: photo.cloudinaryId, error })
    throw error
  }
}

// The record is already gone: a Cloudinary failure only leaves an orphan image,
// so the deletion still succeeds.
async function deleteStoredImage(
  { deleteImage, logger }: PhotosServiceDeps,
  cloudinaryId: string,
): Promise<void> {
  try {
    await deleteImage(cloudinaryId)
  } catch (error: unknown) {
    logger.error('photo.orphaned', { cloudinaryId, error })
  }
}

async function createPhoto(
  deps: PhotosServiceDeps,
  { ownerId, file }: NewPhotoInput,
): Promise<PhotoRecord> {
  const validFile = parseFile(file)
  const jpeg = await convertToFrameJpeg(deps, validFile.buffer)
  // Cloudinary and database failures are ours: they stay 500s.
  const image = await deps.uploadImage(jpeg)
  const record = await saveRecord(deps, { ownerId, ...image })
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
  await deleteStoredImage(deps, record.cloudinaryId)
  deps.logger.info('photo.deleted', {
    photoId: record.id,
    cloudinaryId: record.cloudinaryId,
    userId: ownerId,
  })
  return record.id
}

export function createPhotosService(deps: PhotosServiceDeps): PhotosService {
  return {
    listLatest: (ownerId) => deps.repository.findLatest(ownerId, LATEST_PHOTOS_LIMIT),
    createPhoto: (input) => createPhoto(deps, input),
    deletePhoto: (deletion) => deletePhoto(deps, deletion),
  }
}
