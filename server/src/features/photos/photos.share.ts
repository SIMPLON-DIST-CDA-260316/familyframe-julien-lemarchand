import { AppError } from '../../errors/app-error.js'
import type { SendOutcome } from '../../types.js'
import type { SendRecord } from '../sends/sends.repository.js'
import {
  parseFile,
  parseFriendIds,
  parseMessage,
  parsePhotoId,
  type UploadedFile,
} from './photos.input.js'
import {
  type CopyRequest,
  type SavedCopies,
  type SharedImage,
  saveCopies,
  sortRecipients,
} from './photos.recipients.js'
import type { PhotoRecord, StoredPhoto } from './photos.repository.js'
import type { PhotosServiceDeps } from './photos.service.js'
import { deleteStoredImage, sha256Of, uploadFrameImage } from './photos.store.js'

// photoId comes from the URL, friendIds and message straight from the JSON body: validated here.
export type LibraryShare = {
  senderId: string
  photoId: string
  friendIds: unknown
  message: unknown
}

// friendIds and message are multipart text fields: validated here too.
export type DeviceShare = {
  senderId: string
  file: UploadedFile | undefined
  friendIds: unknown
  message: unknown
}

// copies: the friends' new photos, for the controller to announce in their rooms. send is null
// when nobody received the photo.
export type ShareResult = {
  send: SendRecord | null
  copies: PhotoRecord[]
  outcomes: SendOutcome[]
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

// One history line for the whole action, naming only the friends who received it.
async function recordSend(
  deps: PhotosServiceDeps,
  { senderId, message, image }: CopyRequest,
  copies: PhotoRecord[],
): Promise<SendRecord | null> {
  if (copies.length === 0) {
    return null
  }
  const { url, cloudinaryId } = image
  const recipientIds = copies.map(({ ownerId }) => ownerId)
  const send = await deps.recordSend({ senderId, recipientIds, url, cloudinaryId, message })
  deps.logger.info('send.created', {
    sendId: send.id,
    cloudinaryId,
    userId: senderId,
    recipientCount: recipientIds.length,
    hasMessage: message !== undefined,
  })
  return send
}

function toResult(
  send: SendRecord | null,
  refusals: SendOutcome[],
  saved: SavedCopies,
): ShareResult {
  return { send, copies: saved.copies, outcomes: [...refusals, ...saved.outcomes] }
}

// Every friend gets a new photo pointing to the same Cloudinary image: nothing is uploaded again.
export async function shareFromLibrary(
  deps: PhotosServiceDeps,
  { senderId, photoId, friendIds, message }: LibraryShare,
): Promise<ShareResult> {
  const validPhotoId = parsePhotoId(photoId)
  const validMessage = parseMessage(message)
  const recipientIds = parseFriendIds(friendIds)
  const original = await findOwnedPhoto(deps, validPhotoId, senderId)
  const { eligibleIds, refusals } = await sortRecipients(
    deps,
    senderId,
    recipientIds,
    original.sha256,
  )
  const request: CopyRequest = {
    senderId,
    message: validMessage,
    image: original,
    source: 'library',
    sourcePhotoId: original.id,
  }
  const saved = await saveCopies(deps, eligibleIds, request)
  return toResult(await recordSend(deps, request, saved.copies), refusals, saved)
}

// Uploaded once, only if someone can receive it, then shared like a library photo. It never
// enters the sender's own library.
export async function shareFromDevice(
  deps: PhotosServiceDeps,
  { senderId, file, friendIds, message }: DeviceShare,
): Promise<ShareResult> {
  const { buffer } = parseFile(file)
  const validMessage = parseMessage(message)
  const recipientIds = parseFriendIds(friendIds)
  const sha256 = sha256Of(buffer)
  const { eligibleIds, refusals } = await sortRecipients(deps, senderId, recipientIds, sha256)
  if (eligibleIds.length === 0) {
    return { send: null, copies: [], outcomes: refusals }
  }
  const image: SharedImage = { ...(await uploadFrameImage(deps, buffer)), sha256 }
  const request: CopyRequest = { senderId, message: validMessage, image, source: 'device' }
  const saved = await saveCopies(deps, eligibleIds, request)
  // Concurrent sends reached every friend first: this fresh image is referenced by nothing.
  if (saved.copies.length === 0) {
    await deleteStoredImage(deps, image.cloudinaryId)
  }
  return toResult(await recordSend(deps, request, saved.copies), refusals, saved)
}
