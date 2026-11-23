import { AppError } from '../../errors/app-error.js'
import type { UploadedImage } from '../../lib/cloudinary.js'
import type { Logger } from '../../lib/logger.js'
import type { PhotoRecord, PhotosRepository } from './photos.repository.js'

const MAX_UPLOADER_NAME_LENGTH = 30
const LATEST_PHOTOS_LIMIT = 20
const ALLOWED_TYPES: string[] = ['image/jpeg', 'image/png', 'image/webp']
const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i

export type UploadedFile = { buffer: Buffer; mimetype: string }

export type NewPhotoInput = { uploaderName: unknown; file: UploadedFile | undefined }

export type PhotosServiceDeps = {
  repository: PhotosRepository
  toFrameJpeg: (input: Buffer) => Promise<Buffer>
  uploadImage: (jpeg: Buffer) => Promise<UploadedImage>
  deleteImage: (cloudinaryId: string) => Promise<void>
  logger: Logger
}

export type PhotosService = {
  listLatest: () => Promise<PhotoRecord[]>
  createPhoto: (input: NewPhotoInput) => Promise<PhotoRecord>
  deletePhoto: (id: string) => Promise<string>
}

function parseUploaderName(rawUploaderName: unknown): string {
  const uploaderName = typeof rawUploaderName === 'string' ? rawUploaderName.trim() : ''
  if (uploaderName.length === 0 || uploaderName.length > MAX_UPLOADER_NAME_LENGTH) {
    throw new AppError('UPLOADER_NAME_INVALID')
  }
  return uploaderName
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
  } catch (error) {
    logger.warn('photo.unreadable', { error })
    throw new AppError('IMAGE_UNREADABLE')
  }
}

async function saveRecord(
  { repository, logger }: PhotosServiceDeps,
  image: UploadedImage,
  uploaderName: string,
): Promise<PhotoRecord> {
  try {
    return await repository.create({ ...image, uploaderName })
  } catch (error) {
    // The image is on Cloudinary with no record pointing to it: its id is needed to clean up.
    logger.error('photo.orphaned', { cloudinaryId: image.cloudinaryId, error })
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
  } catch (error) {
    logger.error('photo.orphaned', { cloudinaryId, error })
  }
}

export function createPhotosService(deps: PhotosServiceDeps): PhotosService {
  const { repository, uploadImage, logger } = deps

  async function createPhoto({ uploaderName, file }: NewPhotoInput): Promise<PhotoRecord> {
    const validUploaderName = parseUploaderName(uploaderName)
    const validFile = parseFile(file)
    const jpeg = await convertToFrameJpeg(deps, validFile.buffer)
    // Cloudinary and database failures are ours: they stay 500s.
    const image = await uploadImage(jpeg)
    const record = await saveRecord(deps, image, validUploaderName)
    logger.info('photo.created', { photoId: record.id, cloudinaryId: record.cloudinaryId })
    return record
  }

  // Database first: it decides what the frame shows.
  // Returns the stored id: the one in the URL may differ in case.
  async function deletePhoto(id: string): Promise<string> {
    const record = await repository.deleteById(parsePhotoId(id))
    if (!record) {
      throw new AppError('PHOTO_NOT_FOUND')
    }
    await deleteStoredImage(deps, record.cloudinaryId)
    logger.info('photo.deleted', { photoId: record.id, cloudinaryId: record.cloudinaryId })
    return record.id
  }

  return {
    listLatest: () => repository.findLatest(LATEST_PHOTOS_LIMIT),
    createPhoto,
    deletePhoto,
  }
}
