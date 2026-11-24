import { AppError } from '../../errors/app-error.js'

export const DEFAULT_PAGE_SIZE = 30
export const MAX_PAGE_SIZE = 100
const DIGITS_PATTERN = /^\d+$/
const ALLOWED_TYPES: string[] = ['image/jpeg', 'image/png', 'image/webp']
export const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i

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
