import { describe, expect, it, vi } from 'vitest'
import type { Logger } from '../../lib/logger.js'
import type { PhotoRecord, PhotosRepository } from './photos.repository.js'
import { createPhotosService, type PhotosServiceDeps } from './photos.service.js'

const OWNER_ID = '6b044f9d56a44767c7079b02'
// A photo a friend sent, once opened: the repository answers it with the sender's name.
const OPENED: PhotoRecord = {
  id: '6b044f9d56a44767c7079a02',
  ownerId: OWNER_ID,
  senderId: '6b044f9d56a44767c7079b01',
  message: 'Joyeux anniversaire !',
  isOpened: true,
  openedAt: null,
  url: 'https://res.cloudinary.com/demo/photo.jpg',
  cloudinaryId: 'familyframe/abc',
  sha256: 'sha-of-the-bytes',
  width: 4000,
  height: 3000,
  bytes: 2_400_000,
  createdAt: new Date('2026-11-24T10:00:00Z'),
  sender: { displayName: 'Membre' },
}

// Every dependency succeeds by default; each test breaks only the one it is about.
function makeDeps() {
  return {
    repository: {
      findPage: vi.fn<PhotosRepository['findPage']>(),
      findByOwnerAndSha256: vi.fn<PhotosRepository['findByOwnerAndSha256']>(),
      findOwned: vi.fn<PhotosRepository['findOwned']>(),
      create: vi.fn<PhotosRepository['create']>(),
      deleteOwned: vi.fn<PhotosRepository['deleteOwned']>(),
      openOwned: vi.fn<PhotosRepository['openOwned']>().mockResolvedValue(OPENED),
      findUnopened: vi.fn<PhotosRepository['findUnopened']>().mockResolvedValue([]),
      countImageUses: vi.fn<PhotosRepository['countImageUses']>(),
      findCollectionPhotoIds: vi.fn<PhotosRepository['findCollectionPhotoIds']>(),
    },
    toFrameJpeg: vi.fn<PhotosServiceDeps['toFrameJpeg']>(),
    uploadImage: vi.fn<PhotosServiceDeps['uploadImage']>(),
    deleteImage: vi.fn<PhotosServiceDeps['deleteImage']>(),
    areFriends: vi.fn<PhotosServiceDeps['areFriends']>(),
    recordSend: vi.fn<PhotosServiceDeps['recordSend']>(),
    logger: {
      info: vi.fn<Logger['info']>(),
      warn: vi.fn<Logger['warn']>(),
      error: vi.fn<Logger['error']>(),
    },
  }
}

describe('openPhoto', () => {
  it("opens the owner's photo and returns it with its sender and message", async () => {
    const deps = makeDeps()

    const record = await createPhotosService(deps).openPhoto({ ownerId: OWNER_ID, id: OPENED.id })

    expect(deps.repository.openOwned).toHaveBeenCalledWith(OPENED.id, OWNER_ID)
    expect(record).toBe(OPENED)
  })

  it('logs the opening by identifiers only, never the message', async () => {
    const deps = makeDeps()

    await createPhotosService(deps).openPhoto({ ownerId: OWNER_ID, id: OPENED.id })

    expect(deps.logger.info).toHaveBeenCalledWith('photo.opened', {
      photoId: OPENED.id,
      userId: OWNER_ID,
    })
  })

  it('answers PHOTO_NOT_FOUND for a photo of another account or a missing one', async () => {
    const deps = makeDeps()
    deps.repository.openOwned.mockResolvedValue(null)

    await expect(
      createPhotosService(deps).openPhoto({ ownerId: OWNER_ID, id: OPENED.id }),
    ).rejects.toMatchObject({ code: 'PHOTO_NOT_FOUND' })
    expect(deps.logger.info).not.toHaveBeenCalled()
  })

  it('answers PHOTO_NOT_FOUND for a malformed id, without asking the database', async () => {
    const deps = makeDeps()

    await expect(
      createPhotosService(deps).openPhoto({ ownerId: OWNER_ID, id: 'pas-un-id' }),
    ).rejects.toMatchObject({ code: 'PHOTO_NOT_FOUND' })
    expect(deps.repository.openOwned).not.toHaveBeenCalled()
  })
})

describe('listUnopened', () => {
  it("returns the owner's unopened photos as the repository orders them", async () => {
    const deps = makeDeps()
    const unopened = [{ ...OPENED, isOpened: false }]
    deps.repository.findUnopened.mockResolvedValue(unopened)

    const records = await createPhotosService(deps).listUnopened(OWNER_ID)

    expect(deps.repository.findUnopened).toHaveBeenCalledWith(OWNER_ID)
    expect(records).toBe(unopened)
  })
})
