import { describe, expect, it, vi } from 'vitest'
import type { Logger } from '../../lib/logger.js'
import type { PhotoRecord, PhotosRepository, StoredPhoto } from './photos.repository.js'
import { createPhotosService, type PhotosServiceDeps } from './photos.service.js'

const SENDER_ID = '6b044f9d56a44767c7079b01'
const FRIEND_ID = '6b044f9d56a44767c7079b02'
const IMAGE = { url: 'https://res.cloudinary.com/demo/photo.jpg', cloudinaryId: 'familyframe/abc' }
const ORIGINAL: StoredPhoto = {
  id: '6b044f9d56a44767c7079a01',
  ownerId: SENDER_ID,
  senderId: null,
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
  sender: { displayName: 'Membre' },
  createdAt: new Date('2026-11-24T10:00:00Z'),
}
const MALFORMED_FRIEND_IDS: unknown[] = [undefined, 42, 'pas-un-id']

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
      countByCloudinaryId: vi.fn<PhotosRepository['countByCloudinaryId']>(),
    },
    toFrameJpeg: vi.fn<PhotosServiceDeps['toFrameJpeg']>(),
    uploadImage: vi.fn<PhotosServiceDeps['uploadImage']>(),
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
  })
}

describe('shareFromLibrary', () => {
  it('gives the friend a new photo of the same image, without uploading it again', async () => {
    const deps = makeDeps()

    const record = await shareOriginal(deps, FRIEND_ID)

    expect(record).toBe(COPY)
    expect(deps.areFriends).toHaveBeenCalledWith(SENDER_ID, FRIEND_ID)
    expect(deps.repository.findOwned).toHaveBeenCalledWith(ORIGINAL.id, SENDER_ID)
    expect(deps.repository.findByOwnerAndSha256).toHaveBeenCalledWith(FRIEND_ID, ORIGINAL.sha256)
    expect(deps.repository.create).toHaveBeenCalledWith({
      ownerId: FRIEND_ID,
      senderId: SENDER_ID,
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
