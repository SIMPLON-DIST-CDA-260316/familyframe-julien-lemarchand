import { AppError } from '../../errors/app-error.js'
import type { UploadedImage } from '../../lib/cloudinary.js'
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

export function createPhotosService({
  repository,
  toFrameJpeg,
  uploadImage,
  deleteImage,
}: PhotosServiceDeps): PhotosService {
  async function convertToFrameJpeg(input: Buffer): Promise<Buffer> {
    try {
      return await toFrameJpeg(input)
    } catch {
      throw new AppError('IMAGE_UNREADABLE')
    }
  }

  async function createPhoto({ uploaderName, file }: NewPhotoInput): Promise<PhotoRecord> {
    const validUploaderName = parseUploaderName(uploaderName)
    const validFile = parseFile(file)
    const jpeg = await convertToFrameJpeg(validFile.buffer)
    // Cloudinary and database failures are ours: they stay 500s.
    const image = await uploadImage(jpeg)
    try {
      return await repository.create({ ...image, uploaderName: validUploaderName })
    } catch (error) {
      console.error(`Photo saved on Cloudinary but not in the database: ${image.cloudinaryId}`)
      throw error
    }
  }

  // Database first: it decides what the frame shows. A Cloudinary failure after
  // that only leaves an orphan image, so the deletion still succeeds.
  // Returns the stored id: the one in the URL may differ in case.
  async function deletePhoto(id: string): Promise<string> {
    const record = await repository.deleteById(parsePhotoId(id))
    if (!record) {
      throw new AppError('PHOTO_NOT_FOUND')
    }
    try {
      await deleteImage(record.cloudinaryId)
    } catch (error: unknown) {
      console.error(
        `Photo deleted from the database but not from Cloudinary: ${record.cloudinaryId}`,
        error,
      )
    }
    return record.id
  }

  return {
    listLatest: () => repository.findLatest(LATEST_PHOTOS_LIMIT),
    createPhoto,
    deletePhoto,
  }
}
