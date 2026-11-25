import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import type { Logger } from '../../lib/logger.js'
import type { SendRecord } from '../sends/sends.repository.js'
import type { UploadedFile } from './photos.input.js'
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
const PNG_FILE: UploadedFile = { buffer: Buffer.from('raw png'), mimetype: 'image/png' }
// Computed like the service does: the hash of the original upload bytes.
const PNG_SHA256 = createHash('sha256').update(PNG_FILE.buffer).digest('hex')
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

function sharePng(deps: PhotosServiceDeps, friendIds: unknown): Promise<ShareResult> {
  return createPhotosService(deps).shareFromDevice({
    senderId: SENDER_ID,
    file: PNG_FILE,
    friendIds,
    message: undefined,
  })
}

describe('shareFromDevice', () => {
  it("uploads the file once into every friend's library only, unopened", async () => {
    const deps = makeDeps()

    const result = await sharePng(deps, [FRIEND_ID, OTHER_FRIEND_ID])

    expect(deps.repository.findByOwnerAndSha256).toHaveBeenCalledWith(FRIEND_ID, PNG_SHA256)
    expect(deps.toFrameJpeg).toHaveBeenCalledWith(PNG_FILE.buffer)
    expect(deps.uploadImage).toHaveBeenCalledTimes(1)
    expect(deps.repository.create).toHaveBeenCalledWith({
      ownerId: FRIEND_ID,
      senderId: SENDER_ID,
      message: undefined,
      isOpened: false,
      ...FRESH_IMAGE,
      sha256: PNG_SHA256,
    })
    expect(result.copies).toHaveLength(2)
    expect(deps.recordSend).toHaveBeenCalledWith(
      expect.objectContaining({ ...FRESH_IMAGE, recipientIds: [FRIEND_ID, OTHER_FRIEND_ID] }),
    )
    expect(deps.repository.findOwned).not.toHaveBeenCalled()
  })

  it('logs each copy as a device share', async () => {
    const deps = makeDeps()

    const { copies } = await sharePng(deps, [FRIEND_ID])

    expect(deps.logger.info).toHaveBeenCalledWith('photo.shared', {
      photoId: copies[0].id,
      sourcePhotoId: undefined,
      cloudinaryId: FRESH_IMAGE.cloudinaryId,
      userId: SENDER_ID,
      recipientId: FRIEND_ID,
      source: 'device',
      hasMessage: false,
    })
  })

  it('does no image work when no friend can receive it', async () => {
    const deps = makeDeps()
    deps.areFriends.mockResolvedValueOnce(false)
    deps.repository.findByOwnerAndSha256.mockResolvedValue(EXISTING)

    const result = await sharePng(deps, [FRIEND_ID, OTHER_FRIEND_ID])

    expect(result).toEqual({
      send: null,
      copies: [],
      outcomes: [
        { friendId: FRIEND_ID, status: 'not_friends' },
        { friendId: OTHER_FRIEND_ID, status: 'duplicate' },
      ],
    })
    expect(deps.toFrameJpeg).not.toHaveBeenCalled()
    expect(deps.uploadImage).not.toHaveBeenCalled()
  })

  it('destroys the fresh image when concurrent copies were saved first for everyone', async () => {
    const deps = makeDeps()
    deps.repository.create.mockResolvedValue(null)

    const result = await sharePng(deps, [FRIEND_ID])

    expect(result.send).toBeNull()
    expect(deps.deleteImage).toHaveBeenCalledWith(FRESH_IMAGE.cloudinaryId)
    expect(deps.recordSend).not.toHaveBeenCalled()
  })

  it('keeps the fresh image when at least one copy was saved', async () => {
    const deps = makeDeps()
    deps.repository.create.mockResolvedValueOnce(null)

    const result = await sharePng(deps, [FRIEND_ID, OTHER_FRIEND_ID])

    expect(result.send?.recipientIds).toEqual([OTHER_FRIEND_ID])
    expect(deps.deleteImage).not.toHaveBeenCalled()
  })

  it('destroys the fresh image and fails when saving the first copy fails', async () => {
    const deps = makeDeps()
    deps.repository.create.mockRejectedValue(new Error('database down'))
    deps.repository.countImageUses.mockResolvedValue(0)

    await expect(sharePng(deps, [FRIEND_ID])).rejects.toThrow('database down')
    expect(deps.deleteImage).toHaveBeenCalledWith(FRESH_IMAGE.cloudinaryId)
  })

  it('keeps the fresh image when a copy saved before the failure uses it', async () => {
    const deps = makeDeps()
    deps.repository.create.mockImplementationOnce(async (photo) => copyOf(photo))
    deps.repository.create.mockRejectedValueOnce(new Error('database down'))
    deps.repository.countImageUses.mockResolvedValue(1)

    await expect(sharePng(deps, [FRIEND_ID, OTHER_FRIEND_ID])).rejects.toThrow('database down')
    expect(deps.deleteImage).not.toHaveBeenCalled()
  })

  it('still answers the copies when the history line cannot be saved', async () => {
    const deps = makeDeps()
    deps.recordSend.mockRejectedValue(new Error('database down'))

    const result = await sharePng(deps, [FRIEND_ID])

    expect(result.send).toBeNull()
    expect(result.copies).toHaveLength(1)
    expect(result.outcomes).toEqual([{ friendId: FRIEND_ID, status: 'sent' }])
    expect(deps.logger.error).toHaveBeenCalledWith('send.record_failed', {
      cloudinaryId: FRESH_IMAGE.cloudinaryId,
      userId: SENDER_ID,
      error: expect.any(Error),
    })
    expect(deps.deleteImage).not.toHaveBeenCalled()
  })

  it('rejects a missing file before asking who is friends', async () => {
    const deps = makeDeps()

    await expect(
      createPhotosService(deps).shareFromDevice({
        senderId: SENDER_ID,
        file: undefined,
        friendIds: [FRIEND_ID],
        message: undefined,
      }),
    ).rejects.toMatchObject({ code: 'PHOTO_MISSING' })
    expect(deps.areFriends).not.toHaveBeenCalled()
  })
})
