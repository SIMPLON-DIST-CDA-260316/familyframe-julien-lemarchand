import { AppError } from '../../errors/app-error.js'

export const DEFAULT_PAGE_SIZE = 30
export const MAX_PAGE_SIZE = 100
const DIGITS_PATTERN = /^\d+$/
const ALLOWED_TYPES: string[] = ['image/jpeg', 'image/png', 'image/webp']
export const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i
// A note on a postcard, not a letter: it has to fit under the photo on a frame.
export const MAX_MESSAGE_LENGTH = 200

export type UploadedFile = { buffer: Buffer; mimetype: string }

export function parseFile(file: UploadedFile | undefined): UploadedFile {
  if (!file) {
    throw new AppError('PHOTO_MISSING')
  }
  // Cheap first filter: the browser's mimetype can lie, sharp checks for real.
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    throw new AppError('FORMAT_UNSUPPORTED')
  }
  return file
}

// undefined: no message, the field stays out of the document. A blank message is no message.
// A repeated multipart field arrives as an array: not text, refused like a number.
export function parseMessage(message: unknown): string | undefined {
  if (message === undefined || message === null) {
    return undefined
  }
  if (typeof message !== 'string') {
    throw new AppError('MESSAGE_INVALID')
  }
  const trimmedMessage = message.trim()
  if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
    throw new AppError('MESSAGE_INVALID')
  }
  return trimmedMessage === '' ? undefined : trimmedMessage
}

// Prisma fails on an id that is not an ObjectId: that would be a 500, not a 404.
export function parsePhotoId(id: string): string {
  if (!OBJECT_ID_PATTERN.test(id)) {
    throw new AppError('PHOTO_NOT_FOUND')
  }
  return id
}

// Express 5 gives a string, or an array for a repeated key: only one string of digits passes.
export function parseLimit(limit: unknown): number {
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

export function parseCursor(cursor: unknown): string | undefined {
  if (cursor === undefined) {
    return undefined
  }
  if (typeof cursor !== 'string' || !OBJECT_ID_PATTERN.test(cursor)) {
    throw new AppError('QUERY_INVALID')
  }
  return cursor
}

// undefined: the whole library. A repeated key is a malformed query; a malformed id is one more
// unknown collection, as on the collections routes.
export function parseCollectionFilter(collectionId: unknown): string | undefined {
  if (collectionId === undefined) {
    return undefined
  }
  if (typeof collectionId !== 'string') {
    throw new AppError('QUERY_INVALID')
  }
  if (!OBJECT_ID_PATTERN.test(collectionId)) {
    throw new AppError('COLLECTION_NOT_FOUND')
  }
  return collectionId
}
