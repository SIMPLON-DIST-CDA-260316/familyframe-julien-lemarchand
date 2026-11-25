import { describe, expect, it, vi } from 'vitest'
import type { Logger } from '../../lib/logger.js'
import type { SendRecord } from '../sends/sends.repository.js'
import { MAX_RECIPIENTS } from './photos.input.js'
import type { NewPhoto, PhotoRecord, PhotosRepository, StoredPhoto } from './photos.repository.js'
import { createPhotosService, type PhotosServiceDeps } from './photos.service.js'
import type { ShareResult } from './photos.share.js'

const SENDER_ID = '6b044f9d56a44767c7079b01'
const FRIEND_ID = '6b044f9d56a44767c7079b02'
const OTHER_FRIEND_ID = '6b044f9d56a44767c7079b03'
const IMAGE = { url: 'https://res.cloudinary.com/demo/photo.jpg', cloudinaryId: 'familyframe/abc' }
const ORIGINAL: StoredPhoto = {
  id: '6b044f9d56a44767c7079a01',
  ownerId: SENDER_ID,
  senderId: null,
  message: null,
  isOpened: true,
  openedAt: null,
  ...IMAGE,
  sha256: 'sha-of-the-original-bytes',
  createdAt: new Date('2026-11-23T10:00:00Z'),
}
// The friend's photo of the same file, added or received earlier.
const EXISTING: PhotoRecord = {
  ...ORIGINAL,
  id: '6b044f9d56a44767c7079a09',
  ownerId: FRIEND_ID,
  sender: null,
}
const MALFORMED_FRIEND_IDS: unknown[] = [undefined, 42, [], [42], { id: FRIEND_ID }]
const FRAME_JPEG = Buffer.from('frame jpeg')
// A device send uploads a new image: not the original's.
const FRESH_IMAGE = {
  url: 'https://res.cloudinary.com/demo/fresh.jpg',
  cloudinaryId: 'familyframe/fresh',
}

// The friend's new photo, as the repository returns it: with the sender's name.
function copyOf(photo: NewPhoto): PhotoRecord {
  return {
    id: `6b044f9d56a44767c7079a${photo.ownerId.slice(-2)}`,
    senderId: null,
    message: null,
    openedAt: null,
    ...photo,
    sender: { displayName: 'Membre' },
    createdAt: new Date('2026-11-24T10:00:00Z'),
  }
}

function sendOf(send: Parameters<PhotosServiceDeps['recordSend']>[0]): SendRecord {
  return {
    id: '6b044f9d56a44767c7079c01',
    message: null,
    ...send,
    createdAt: new Date('2026-11-24T10:00:00Z'),
    recipients: send.recipientIds.map((id) => ({ id, displayName: 'Ami' })),
  }
}

// Every dependency succeeds by default; each test breaks only the one it is about.
function makeDeps() {
  return {
    repository: {
      findPage: vi.fn<PhotosRepository['findPage']>(),
      findByOwnerAndSha256: vi
        .fn<PhotosRepository['findByOwnerAndSha256']>()
        .mockResolvedValue(null),
      findOwned: vi.fn<PhotosRepository['findOwned']>().mockResolvedValue(ORIGINAL),
      create: vi
        .fn<PhotosRepository['create']>()
        .mockImplementation(async (photo) => copyOf(photo)),
      deleteOwned: vi.fn<PhotosRepository['deleteOwned']>(),
      openOwned: vi.fn<PhotosRepository['openOwned']>(),
      findUnopened: vi.fn<PhotosRepository['findUnopened']>(),
      countImageUses: vi.fn<PhotosRepository['countImageUses']>(),
      findCollectionPhotoIds: vi.fn<PhotosRepository['findCollectionPhotoIds']>(),
    },
    toFrameJpeg: vi.fn<PhotosServiceDeps['toFrameJpeg']>().mockResolvedValue(FRAME_JPEG),
    uploadImage: vi.fn<PhotosServiceDeps['uploadImage']>().mockResolvedValue(FRESH_IMAGE),
    deleteImage: vi.fn<PhotosServiceDeps['deleteImage']>().mockResolvedValue(undefined),
    areFriends: vi.fn<PhotosServiceDeps['areFriends']>().mockResolvedValue(true),
    recordSend: vi
      .fn<PhotosServiceDeps['recordSend']>()
      .mockImplementation(async (send) => sendOf(send)),
    logger: {
      info: vi.fn<Logger['info']>(),
      warn: vi.fn<Logger['warn']>(),
      error: vi.fn<Logger['error']>(),
    },
  }
}

function shareOriginal(deps: PhotosServiceDeps, friendIds: unknown): Promise<ShareResult> {
  return createPhotosService(deps).shareFromLibrary({
    senderId: SENDER_ID,
    photoId: ORIGINAL.id,
    friendIds,
    message: undefined,
  })
}

describe('shareFromLibrary', () => {
  it('gives each friend a new, unopened photo of the same image, without uploading it again', async () => {
    const deps = makeDeps()

    const result = await shareOriginal(deps, [FRIEND_ID, OTHER_FRIEND_ID])

    expect(result.copies.map(({ ownerId }) => ownerId)).toEqual([FRIEND_ID, OTHER_FRIEND_ID])
    expect(deps.repository.findOwned).toHaveBeenCalledWith(ORIGINAL.id, SENDER_ID)
    expect(deps.repository.create).toHaveBeenCalledWith({
      ownerId: OTHER_FRIEND_ID,
      senderId: SENDER_ID,
      message: undefined,
      isOpened: false,
      ...IMAGE,
      sha256: ORIGINAL.sha256,
    })
    expect(deps.toFrameJpeg).not.toHaveBeenCalled()
    expect(deps.uploadImage).not.toHaveBeenCalled()
  })

  it('records one send for the whole action, naming the friends who received it', async () => {
    const deps = makeDeps()

    const result = await shareOriginal(deps, [FRIEND_ID, OTHER_FRIEND_ID])

    expect(deps.recordSend).toHaveBeenCalledTimes(1)
    expect(deps.recordSend).toHaveBeenCalledWith({
      senderId: SENDER_ID,
      recipientIds: [FRIEND_ID, OTHER_FRIEND_ID],
      ...IMAGE,
      message: undefined,
    })
    expect(result.send?.recipientIds).toEqual([FRIEND_ID, OTHER_FRIEND_ID])
    expect(result.outcomes).toEqual([
      { friendId: FRIEND_ID, status: 'sent' },
      { friendId: OTHER_FRIEND_ID, status: 'sent' },
    ])
  })

  it('logs the share and the send by identifiers only, never the sender name', async () => {
    const deps = makeDeps()

    const { copies } = await shareOriginal(deps, [FRIEND_ID])

    expect(deps.logger.info).toHaveBeenCalledWith('photo.shared', {
      photoId: copies[0].id,
      sourcePhotoId: ORIGINAL.id,
      cloudinaryId: IMAGE.cloudinaryId,
      userId: SENDER_ID,
      recipientId: FRIEND_ID,
      source: 'library',
      hasMessage: false,
    })
    expect(deps.logger.info).toHaveBeenCalledWith('send.created', {
      sendId: '6b044f9d56a44767c7079c01',
      cloudinaryId: IMAGE.cloudinaryId,
      userId: SENDER_ID,
      recipientCount: 1,
      hasMessage: false,
    })
    expect(JSON.stringify(deps.logger.info.mock.calls)).not.toContain('Membre')
  })

  it('sends once to a friend chosen twice, and accepts a single id as text', async () => {
    const deps = makeDeps()

    await shareOriginal(deps, [FRIEND_ID, FRIEND_ID])
    await shareOriginal(deps, FRIEND_ID)

    expect(deps.repository.create).toHaveBeenCalledTimes(2)
  })

  it('rejects a photo id that is not an ObjectId without any query', async () => {
    const deps = makeDeps()

    await expect(
      createPhotosService(deps).shareFromLibrary({
        senderId: SENDER_ID,
        photoId: 'pas-un-id',
        friendIds: [FRIEND_ID],
        message: undefined,
      }),
    ).rejects.toMatchObject({ code: 'PHOTO_NOT_FOUND' })
    expect(deps.areFriends).not.toHaveBeenCalled()
    expect(deps.repository.findOwned).not.toHaveBeenCalled()
  })

  it("rejects a photo the sender does not own: unknown, or someone else's", async () => {
    const deps = makeDeps()
    deps.repository.findOwned.mockResolvedValue(null)

    await expect(shareOriginal(deps, [FRIEND_ID])).rejects.toMatchObject({
      code: 'PHOTO_NOT_FOUND',
    })
    expect(deps.repository.create).not.toHaveBeenCalled()
    expect(deps.recordSend).not.toHaveBeenCalled()
  })

  it.each(MALFORMED_FRIEND_IDS)(
    'refuses friendIds %j as a malformed request',
    async (friendIds) => {
      const deps = makeDeps()

      await expect(shareOriginal(deps, friendIds)).rejects.toMatchObject({ code: 'BODY_INVALID' })
      expect(deps.repository.findOwned).not.toHaveBeenCalled()
    },
  )

  it('refuses more friends than a send allows', async () => {
    const deps = makeDeps()
    const tooMany = Array.from({ length: MAX_RECIPIENTS + 1 }, (_, index) =>
      index.toString(16).padStart(24, '0'),
    )

    await expect(shareOriginal(deps, tooMany)).rejects.toMatchObject({ code: 'BODY_INVALID' })
  })

  it('answers not_friends for an account that is no accepted friend, and sends to the others', async () => {
    const deps = makeDeps()
    deps.areFriends.mockImplementation(async (_senderId, friendId) => friendId === FRIEND_ID)

    const result = await shareOriginal(deps, ['pas-un-id', OTHER_FRIEND_ID, FRIEND_ID])

    expect(result.outcomes).toEqual([
      { friendId: 'pas-un-id', status: 'not_friends' },
      { friendId: OTHER_FRIEND_ID, status: 'not_friends' },
      { friendId: FRIEND_ID, status: 'sent' },
    ])
    // A malformed id never reaches the friendships query.
    expect(deps.areFriends).not.toHaveBeenCalledWith(SENDER_ID, 'pas-un-id')
    expect(result.send?.recipientIds).toEqual([FRIEND_ID])
    expect(deps.logger.warn).toHaveBeenCalledWith('photo.share_refused', {
      reason: 'not_friends',
      userId: SENDER_ID,
    })
  })

  it('answers duplicate for a friend who has the file, before writing anything for them', async () => {
    const deps = makeDeps()
    deps.repository.findByOwnerAndSha256.mockResolvedValue(EXISTING)

    const result = await shareOriginal(deps, [FRIEND_ID])

    expect(result.outcomes).toEqual([{ friendId: FRIEND_ID, status: 'duplicate' }])
    expect(deps.repository.create).not.toHaveBeenCalled()
  })

  it('records nothing when nobody received the photo', async () => {
    const deps = makeDeps()
    deps.areFriends.mockResolvedValue(false)

    const result = await shareOriginal(deps, [FRIEND_ID])

    expect(result.send).toBeNull()
    expect(result.copies).toEqual([])
    expect(deps.recordSend).not.toHaveBeenCalled()
  })

  it('answers duplicate when a concurrent share saved first, and keeps the image', async () => {
    const deps = makeDeps()
    deps.repository.create.mockResolvedValue(null)

    const result = await shareOriginal(deps, [FRIEND_ID])

    expect(result.outcomes).toEqual([{ friendId: FRIEND_ID, status: 'duplicate' }])
    // The original photo still uses the image: only a fresh upload is destroyed on a race.
    expect(deps.deleteImage).not.toHaveBeenCalled()
    expect(deps.logger.info).toHaveBeenCalledWith('photo.duplicate', {
      userId: FRIEND_ID,
      cloudinaryId: IMAGE.cloudinaryId,
    })
  })
})
