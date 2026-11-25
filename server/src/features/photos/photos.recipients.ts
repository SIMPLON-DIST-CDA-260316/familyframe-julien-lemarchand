import type { SendOutcome } from '../../types.js'
import { OBJECT_ID_PATTERN } from './photos.input.js'
import type { PhotoRecord } from './photos.repository.js'
import type { PhotosServiceDeps } from './photos.service.js'

// The image a send gives, the sender's photo or a fresh upload: every copy points to it.
export type SharedImage = { url: string; cloudinaryId: string; sha256: string }

// Who can receive the photo, and the answer for the others.
export type SortedRecipients = { eligibleIds: string[]; refusals: SendOutcome[] }

// sourcePhotoId only for a photo from the sender's library: the logs link the copy to it.
export type CopyRequest = {
  senderId: string
  message: string | undefined
  image: SharedImage
  source: 'library' | 'device'
  sourcePhotoId?: string
}

export type SavedCopies = { copies: PhotoRecord[]; outcomes: SendOutcome[] }

// Malformed, unknown, pending or oneself: one answer, the id is no accepted friend's.
// A malformed id never reaches the database: Prisma would fail on it.
async function isAcceptedFriend(
  { areFriends, logger }: PhotosServiceDeps,
  friendId: string,
  senderId: string,
): Promise<boolean> {
  if (OBJECT_ID_PATTERN.test(friendId) && (await areFriends(senderId, friendId))) {
    return true
  }
  logger.warn('photo.share_refused', { reason: 'not_friends', userId: senderId })
  return false
}

// Saves the image work for a friend who has the file; the unique index is the real guarantee.
async function hasFile(
  { repository, logger }: PhotosServiceDeps,
  friendId: string,
  sha256: string,
): Promise<boolean> {
  const existing = await repository.findByOwnerAndSha256(friendId, sha256)
  if (existing) {
    logger.info('photo.duplicate', { userId: friendId, photoId: existing.id })
  }
  return existing !== null
}

// Before any write or upload: a device send uploads only if someone can receive it.
export async function sortRecipients(
  deps: PhotosServiceDeps,
  senderId: string,
  friendIds: string[],
  sha256: string,
): Promise<SortedRecipients> {
  const sorted: SortedRecipients = { eligibleIds: [], refusals: [] }
  for (const friendId of friendIds) {
    if (!(await isAcceptedFriend(deps, friendId, senderId))) {
      sorted.refusals.push({ friendId, status: 'not_friends' })
    } else if (await hasFile(deps, friendId, sha256)) {
      sorted.refusals.push({ friendId, status: 'duplicate' })
    } else {
      sorted.eligibleIds.push(friendId)
    }
  }
  return sorted
}

// null: a concurrent send of the same file reached this friend first.
async function saveCopy(
  deps: PhotosServiceDeps,
  recipientId: string,
  { senderId, message, image, source, sourcePhotoId }: CopyRequest,
): Promise<PhotoRecord | null> {
  const { url, cloudinaryId, sha256 } = image
  const copy = {
    ownerId: recipientId,
    senderId,
    message,
    isOpened: false,
    url,
    cloudinaryId,
    sha256,
  }
  const record = await deps.repository.create(copy)
  if (!record) {
    deps.logger.info('photo.duplicate', { userId: recipientId, cloudinaryId })
    return null
  }
  deps.logger.info('photo.shared', {
    photoId: record.id,
    sourcePhotoId,
    cloudinaryId,
    userId: senderId,
    recipientId,
    source,
    hasMessage: message !== undefined,
  })
  return record
}

// Each friend gets their own unopened photo, carrying this sender's message, never the one the
// original came with. One after the other: a family send is a handful of people.
export async function saveCopies(
  deps: PhotosServiceDeps,
  recipientIds: string[],
  request: CopyRequest,
): Promise<SavedCopies> {
  const saved: SavedCopies = { copies: [], outcomes: [] }
  for (const friendId of recipientIds) {
    const copy = await saveCopy(deps, friendId, request)
    if (copy) {
      saved.copies.push(copy)
    }
    saved.outcomes.push({ friendId, status: copy ? 'sent' : 'duplicate' })
  }
  return saved
}
