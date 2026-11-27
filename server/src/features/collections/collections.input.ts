import { AppError } from '../../errors/app-error.js'
import { OBJECT_ID_PATTERN, parsePhotoId } from '../photos/photos.input.js'

// A menu entry, like a display name: a bound keeps the menus and the frame settings readable.
export const MAX_COLLECTION_NAME_LENGTH = 50

// One add from the library picker: more than a few pages of photos is no list the page sends.
export const MAX_PHOTOS_PER_ADD = 100

// Trimmed, like a display name: « Noël » and « Noël  » are the same name.
export function parseCollectionName(name: unknown): string {
  if (typeof name !== 'string') {
    throw new AppError('COLLECTION_NAME_INVALID')
  }
  const trimmedName = name.trim()
  if (trimmedName.length === 0 || trimmedName.length > MAX_COLLECTION_NAME_LENGTH) {
    throw new AppError('COLLECTION_NAME_INVALID')
  }
  return trimmedName
}

// Prisma fails on an id that is not an ObjectId: that would be a 500, not a 404.
export function parseCollectionId(id: string): string {
  if (!OBJECT_ID_PATTERN.test(id)) {
    throw new AppError('COLLECTION_NOT_FOUND')
  }
  return id
}

// MongoDB answers ObjectIds in lowercase: an id sent in capitals must compare equal to it.
export function parseMemberPhotoId(photoId: string): string {
  return parsePhotoId(photoId).toLowerCase()
}

// photoIds comes straight from the JSON body: 1 to MAX_PHOTOS_PER_ADD ids, text only. A photo
// chosen twice is added once.
export function parsePhotoIds(photoIds: unknown): string[] {
  if (!Array.isArray(photoIds) || photoIds.length === 0 || photoIds.length > MAX_PHOTOS_PER_ADD) {
    throw new AppError('BODY_INVALID')
  }
  const textIds = photoIds.filter((photoId): photoId is string => typeof photoId === 'string')
  if (textIds.length !== photoIds.length) {
    throw new AppError('BODY_INVALID')
  }
  return [...new Set(textIds.map(parseMemberPhotoId))]
}
