import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import type { Logger } from '../../lib/logger.js'
import type { UploadedFile } from './photos.input.js'
import type { PhotoRecord, PhotosRepository, StoredPhoto } from './photos.repository.js'
import { createPhotosService, type PhotosServiceDeps } from './photos.service.js'

const SENDER_ID = '6b044f9d56a44767c7079b01'
const FRIEND_ID = '6b044f9d56a44767c7079b02'
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
// The friend's new photo, as the repository returns it: with the sender's name.
const COPY: PhotoRecord = {
  ...ORIGINAL,
  id: '6b044f9d56a44767c7079a02',
  ownerId: FRIEND_ID,
  senderId: SENDER_ID,
  isOpened: false,
  sender: { displayName: 'Membre' },
  createdAt: new Date('2026-11-24T10:00:00Z'),
}
const MALFORMED_FRIEND_IDS: unknown[] = [undefined, 42, 'pas-un-id']
const PNG_FILE: UploadedFile = { buffer: Buffer.from('raw png'), mimetype: 'image/png' }
// Computed like the service does: the hash of the original upload bytes.
const PNG_SHA256 = createHash('sha256').update(PNG_FILE.buffer).digest('hex')
const FRAME_JPEG = Buffer.from('frame jpeg')
// A device share uploads a new image: not the original's.
const FRESH_IMAGE = {
  url: 'https://res.cloudinary.com/demo/fresh.jpg',
  cloudinaryId: 'familyframe/fresh',
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
      create: vi.fn<PhotosRepository['create']>().mockResolvedValue(COPY),
      deleteOwned: vi.fn<PhotosRepository['deleteOwned']>(),
      openOwned: vi.fn<PhotosRepository['openOwned']>(),
      findUnopened: vi.fn<PhotosRepository['findUnopened']>(),
      countByCloudinaryId: vi.fn<PhotosRepository['countByCloudinaryId']>(),
    },
    toFrameJpeg: vi.fn<PhotosServiceDeps['toFrameJpeg']>().mockResolvedValue(FRAME_JPEG),
    uploadImage: vi.fn<PhotosServiceDeps['uploadImage']>().mockResolvedValue(FRESH_IMAGE),
    deleteImage: vi.fn<PhotosServiceDeps['deleteImage']>().mockResolvedValue(undefined),
    areFriends: vi.fn<PhotosServiceDeps['areFriends']>().mockResolvedValue(true),
    logger: {
      info: vi.fn<Logger['info']>(),
      warn: vi.fn<Logger['warn']>(),
      error: vi.fn<Logger['error']>(),
    },
  }
}

function shareOriginal(deps: PhotosServiceDeps, friendId: unknown): Promise<PhotoRecord> {
  return createPhotosService(deps).shareFromLibrary({
    senderId: SENDER_ID,
    photoId: ORIGINAL.id,
    friendId,
    message: undefined,
  })
}

describe('shareFromLibrary', () => {
  it('gives the friend a new, unopened photo of the same image, without uploading it again', async () => {
    const deps = makeDeps()

    const record = await shareOriginal(deps, FRIEND_ID)

    expect(record).toBe(COPY)
    expect(deps.areFriends).toHaveBeenCalledWith(SENDER_ID, FRIEND_ID)
    expect(deps.repository.findOwned).toHaveBeenCalledWith(ORIGINAL.id, SENDER_ID)
    expect(deps.repository.findByOwnerAndSha256).toHaveBeenCalledWith(FRIEND_ID, ORIGINAL.sha256)
    expect(deps.repository.create).toHaveBeenCalledWith({
      ownerId: FRIEND_ID,
      senderId: SENDER_ID,
      isOpened: false,
      ...IMAGE,
      sha256: ORIGINAL.sha256,
    })
    expect(deps.toFrameJpeg).not.toHaveBeenCalled()
    expect(deps.uploadImage).not.toHaveBeenCalled()
  })

  it('logs the share by identifiers only, never the sender name', async () => {
    const deps = makeDeps()

    await shareOriginal(deps, FRIEND_ID)

    expect(deps.logger.info).toHaveBeenCalledWith('photo.shared', {
      photoId: COPY.id,
      sourcePhotoId: ORIGINAL.id,
      cloudinaryId: IMAGE.cloudinaryId,
      userId: SENDER_ID,
      recipientId: FRIEND_ID,
      source: 'library',
      hasMessage: false,
    })
    expect(JSON.stringify(deps.logger.info.mock.calls)).not.toContain('Membre')
  })

  it('rejects a photo id that is not an ObjectId without any query', async () => {
    const deps = makeDeps()

    await expect(
      createPhotosService(deps).shareFromLibrary({
        senderId: SENDER_ID,
        photoId: 'pas-un-id',
        friendId: FRIEND_ID,
        message: undefined,
      }),
    ).rejects.toMatchObject({ code: 'PHOTO_NOT_FOUND' })
    expect(deps.areFriends).not.toHaveBeenCalled()
    expect(deps.repository.findOwned).not.toHaveBeenCalled()
  })

  it("rejects a photo the sender does not own: unknown, or someone else's", async () => {
    const deps = makeDeps()
    deps.repository.findOwned.mockResolvedValue(null)

    await expect(shareOriginal(deps, FRIEND_ID)).rejects.toMatchObject({ code: 'PHOTO_NOT_FOUND' })
    expect(deps.repository.create).not.toHaveBeenCalled()
  })

  it('refuses an account that is no accepted friend: unknown, pending or oneself', async () => {
    const deps = makeDeps()
    deps.areFriends.mockResolvedValue(false)

    await expect(shareOriginal(deps, FRIEND_ID)).rejects.toMatchObject({ code: 'NOT_FRIENDS' })
    expect(deps.repository.findOwned).not.toHaveBeenCalled()
    expect(deps.repository.create).not.toHaveBeenCalled()
    expect(deps.logger.warn).toHaveBeenCalledWith('photo.share_refused', {
      reason: 'not_friends',
      userId: SENDER_ID,
    })
  })

  it.each(MALFORMED_FRIEND_IDS)(
    'refuses friendId %s without asking who is friends',
    async (friendId) => {
      const deps = makeDeps()

      await expect(shareOriginal(deps, friendId)).rejects.toMatchObject({ code: 'NOT_FRIENDS' })
      expect(deps.areFriends).not.toHaveBeenCalled()
      expect(deps.repository.findOwned).not.toHaveBeenCalled()
    },
  )

  it('rejects a file the friend already has, before writing anything', async () => {
    const deps = makeDeps()
    deps.repository.findByOwnerAndSha256.mockResolvedValue(COPY)

    await expect(shareOriginal(deps, FRIEND_ID)).rejects.toMatchObject({ code: 'PHOTO_DUPLICATE' })
    expect(deps.repository.create).not.toHaveBeenCalled()
  })

  it('rejects a duplicate a concurrent share saved first, and keeps the image', async () => {
    const deps = makeDeps()
    deps.repository.create.mockResolvedValue(null)

    await expect(shareOriginal(deps, FRIEND_ID)).rejects.toMatchObject({ code: 'PHOTO_DUPLICATE' })
    // The original photo still uses the image: only a fresh upload is destroyed on a race.
    expect(deps.deleteImage).not.toHaveBeenCalled()
    expect(deps.logger.info).toHaveBeenCalledWith('photo.duplicate', {
      userId: FRIEND_ID,
      cloudinaryId: IMAGE.cloudinaryId,
    })
  })
})

function sharePng(deps: PhotosServiceDeps, friendId: unknown): Promise<PhotoRecord> {
  return createPhotosService(deps).shareFromDevice({
    senderId: SENDER_ID,
    file: PNG_FILE,
    friendId,
    message: undefined,
  })
}

describe('shareFromDevice', () => {
  it("converts and uploads the file into the friend's library only, unopened", async () => {
    const deps = makeDeps()

    const record = await sharePng(deps, FRIEND_ID)

    expect(record).toBe(COPY)
    expect(deps.repository.findByOwnerAndSha256).toHaveBeenCalledWith(FRIEND_ID, PNG_SHA256)
    expect(deps.toFrameJpeg).toHaveBeenCalledWith(PNG_FILE.buffer)
    expect(deps.uploadImage).toHaveBeenCalledWith(FRAME_JPEG)
    expect(deps.repository.create).toHaveBeenCalledWith({
      ownerId: FRIEND_ID,
      senderId: SENDER_ID,
      isOpened: false,
      ...FRESH_IMAGE,
      sha256: PNG_SHA256,
    })
    expect(deps.repository.findOwned).not.toHaveBeenCalled()
    expect(deps.logger.info).toHaveBeenCalledWith('photo.shared', {
      photoId: COPY.id,
      cloudinaryId: COPY.cloudinaryId,
      userId: SENDER_ID,
      recipientId: FRIEND_ID,
      source: 'device',
      hasMessage: false,
    })
  })

  it('refuses an account that is no accepted friend before any image work', async () => {
    const deps = makeDeps()
    deps.areFriends.mockResolvedValue(false)

    await expect(sharePng(deps, FRIEND_ID)).rejects.toMatchObject({ code: 'NOT_FRIENDS' })
    expect(deps.repository.findByOwnerAndSha256).not.toHaveBeenCalled()
    expect(deps.toFrameJpeg).not.toHaveBeenCalled()
    expect(deps.uploadImage).not.toHaveBeenCalled()
  })

  it('rejects a file the friend already has before any image work', async () => {
    const deps = makeDeps()
    deps.repository.findByOwnerAndSha256.mockResolvedValue(COPY)

    await expect(sharePng(deps, FRIEND_ID)).rejects.toMatchObject({ code: 'PHOTO_DUPLICATE' })
    expect(deps.toFrameJpeg).not.toHaveBeenCalled()
    expect(deps.uploadImage).not.toHaveBeenCalled()
  })

  it('destroys the fresh image when a concurrent copy was saved first', async () => {
    const deps = makeDeps()
    deps.repository.create.mockResolvedValue(null)

    await expect(sharePng(deps, FRIEND_ID)).rejects.toMatchObject({ code: 'PHOTO_DUPLICATE' })
    expect(deps.deleteImage).toHaveBeenCalledWith(FRESH_IMAGE.cloudinaryId)
  })

  it('rejects a missing file before asking who is friends', async () => {
    const deps = makeDeps()

    await expect(
      createPhotosService(deps).shareFromDevice({
        senderId: SENDER_ID,
        file: undefined,
        friendId: FRIEND_ID,
        message: undefined,
      }),
    ).rejects.toMatchObject({ code: 'PHOTO_MISSING' })
    expect(deps.areFriends).not.toHaveBeenCalled()
  })
})
