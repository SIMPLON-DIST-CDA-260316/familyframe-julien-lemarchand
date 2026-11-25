import { createHash } from 'node:crypto'
import { AppError } from '../../errors/app-error.js'
import type { UploadedImage } from '../../lib/cloudinary.js'
import type { Logger } from '../../lib/logger.js'
import type { NewPhoto, PhotoRecord, PhotosRepository } from './photos.repository.js'

export const DEFAULT_PAGE_SIZE = 30
export const MAX_PAGE_SIZE = 100
const DIGITS_PATTERN = /^\d+$/
const ALLOWED_TYPES: string[] = ['image/jpeg', 'image/png', 'image/webp']
const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i

export type UploadedFile = { buffer: Buffer; mimetype: string }

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
  logger: Logger
}

export type PhotosService = {
  listPage: (input: PageInput) => Promise<RecordPage>
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

// Express 5 gives a string, or an array for a repeated key: only one string of digits passes.
function parseLimit(limit: unknown): number {
  if (limit === undefined) {
    return DEFAULT_PAGE_SIZE
  }
  if (typeof limit !== 'string' || !DIGITS_PATTERN.test(limit)) {
    throw new AppError('QUERY_INVALID')
  }
  const pageSize = Number(limit)
  if (pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
    throw new AppError('QUERY_INVALID')
  }
  return pageSize
}

function parseCursor(cursor: unknown): string | undefined {
  if (cursor === undefined) {
    return undefined
  }
  if (typeof cursor !== 'string' || !OBJECT_ID_PATTERN.test(cursor)) {
    throw new AppError('QUERY_INVALID')
  }
  return cursor
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

// A share (step 5) points to the same image: it goes with the last photo using it.
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
  const validFile = parseFile(file)
  const sha256 = sha256Of(validFile.buffer)
  await rejectKnownFile(deps, ownerId, sha256)
  const jpeg = await convertToFrameJpeg(deps, validFile.buffer)
  // Cloudinary and database failures are ours: they stay 500s.
  const image = await deps.uploadImage(jpeg)
  const record = await saveRecord(deps, { ownerId, ...image, sha256 })
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
  }
}
