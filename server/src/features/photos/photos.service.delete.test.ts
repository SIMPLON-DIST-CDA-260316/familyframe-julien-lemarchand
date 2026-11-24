import { describe, expect, it, vi } from 'vitest'
import type { Logger } from '../../lib/logger.js'
import type { PhotoRecord, PhotosRepository } from './photos.repository.js'
import { createPhotosService, type PhotosServiceDeps } from './photos.service.js'

const OWNER_ID = '6b044f9d56a44767c7079b01'
const IMAGE = { url: 'https://res.cloudinary.com/demo/photo.jpg', cloudinaryId: 'familyframe/abc' }
const RECORD: PhotoRecord = {
  id: '6b044f9d56a44767c7079a01',
  ownerId: OWNER_ID,
  ...IMAGE,
  sha256: 'sha-of-the-original-bytes',
  createdAt: new Date('2026-11-23T10:00:00Z'),
}

// Every dependency succeeds by default; each test breaks only the one it is about.
// Deleting never converts or uploads: those fakes stay unused.
function makeDeps() {
  return {
    repository: {
      findPage: vi.fn<PhotosRepository['findPage']>(),
      findByOwnerAndSha256: vi.fn<PhotosRepository['findByOwnerAndSha256']>(),
      create: vi.fn<PhotosRepository['create']>(),
      deleteOwned: vi.fn<PhotosRepository['deleteOwned']>().mockResolvedValue(RECORD),
      countByCloudinaryId: vi.fn<PhotosRepository['countByCloudinaryId']>().mockResolvedValue(0),
    },
    toFrameJpeg: vi.fn<PhotosServiceDeps['toFrameJpeg']>(),
    uploadImage: vi.fn<PhotosServiceDeps['uploadImage']>(),
    deleteImage: vi.fn<PhotosServiceDeps['deleteImage']>().mockResolvedValue(undefined),
    logger: {
      info: vi.fn<Logger['info']>(),
      warn: vi.fn<Logger['warn']>(),
      error: vi.fn<Logger['error']>(),
    },
  }
}

describe('deletePhoto', () => {
  it("deletes the owner's record, then its image once no photo uses it, and returns the id", async () => {
    const deps = makeDeps()

    const deletedId = await createPhotosService(deps).deletePhoto({
      ownerId: OWNER_ID,
      id: RECORD.id,
    })

    expect(deletedId).toBe(RECORD.id)
    expect(deps.repository.deleteOwned).toHaveBeenCalledWith(RECORD.id, OWNER_ID)
    expect(deps.repository.countByCloudinaryId).toHaveBeenCalledWith(IMAGE.cloudinaryId)
    // Counted after the deletion: the deleted photo must not count itself.
    expect(deps.repository.deleteOwned.mock.invocationCallOrder[0]).toBeLessThan(
      deps.repository.countByCloudinaryId.mock.invocationCallOrder[0],
    )
    expect(deps.deleteImage).toHaveBeenCalledWith(IMAGE.cloudinaryId)
  })

  it('keeps the image while another photo still uses it', async () => {
    const deps = makeDeps()
    deps.repository.countByCloudinaryId.mockResolvedValue(1)

    await expect(
      createPhotosService(deps).deletePhoto({ ownerId: OWNER_ID, id: RECORD.id }),
    ).resolves.toBe(RECORD.id)
    expect(deps.deleteImage).not.toHaveBeenCalled()
    expect(deps.logger.info).toHaveBeenCalledWith('photo.deleted', {
      photoId: RECORD.id,
      cloudinaryId: RECORD.cloudinaryId,
      userId: OWNER_ID,
      isImageDestroyed: false,
    })
    expect(deps.logger.error).not.toHaveBeenCalled()
  })

  it('keeps the deletion and the image when the reference count fails', async () => {
    const deps = makeDeps()
    deps.repository.countByCloudinaryId.mockRejectedValue(new Error('database down'))

    await expect(
      createPhotosService(deps).deletePhoto({ ownerId: OWNER_ID, id: RECORD.id }),
    ).resolves.toBe(RECORD.id)
    expect(deps.deleteImage).not.toHaveBeenCalled()
    expect(deps.logger.error).toHaveBeenCalledWith('photo.orphaned', {
      cloudinaryId: IMAGE.cloudinaryId,
      error: expect.any(Error),
    })
    expect(deps.logger.info).toHaveBeenCalledWith(
      'photo.deleted',
      expect.objectContaining({ isImageDestroyed: false }),
    )
  })

  it('logs the deleted photo by its identifiers and its owner id', async () => {
    const deps = makeDeps()

    await createPhotosService(deps).deletePhoto({ ownerId: OWNER_ID, id: RECORD.id })

    expect(deps.logger.info).toHaveBeenCalledWith('photo.deleted', {
      photoId: RECORD.id,
      cloudinaryId: RECORD.cloudinaryId,
      userId: OWNER_ID,
      isImageDestroyed: true,
    })
  })

  it('returns the stored id when the URL has it in upper case', async () => {
    const deps = makeDeps()

    const deletedId = await createPhotosService(deps).deletePhoto({
      ownerId: OWNER_ID,
      id: RECORD.id.toUpperCase(),
    })

    expect(deletedId).toBe(RECORD.id)
  })

  it("rejects an id with no photo of this owner: unknown, already deleted, or someone else's", async () => {
    const deps = makeDeps()
    deps.repository.deleteOwned.mockResolvedValue(null)

    await expect(
      createPhotosService(deps).deletePhoto({ ownerId: OWNER_ID, id: RECORD.id }),
    ).rejects.toMatchObject({ code: 'PHOTO_NOT_FOUND' })
    expect(deps.deleteImage).not.toHaveBeenCalled()
  })

  it('rejects an id that is not an ObjectId without querying the database', async () => {
    const deps = makeDeps()

    await expect(
      createPhotosService(deps).deletePhoto({ ownerId: OWNER_ID, id: 'abc' }),
    ).rejects.toMatchObject({ code: 'PHOTO_NOT_FOUND' })
    expect(deps.repository.deleteOwned).not.toHaveBeenCalled()
  })

  it('still succeeds when Cloudinary fails, and logs the orphaned image', async () => {
    const deps = makeDeps()
    const cloudinaryError = new Error('Cloudinary is down')
    deps.deleteImage.mockRejectedValue(cloudinaryError)

    await expect(
      createPhotosService(deps).deletePhoto({ ownerId: OWNER_ID, id: RECORD.id }),
    ).resolves.toBe(RECORD.id)
    expect(deps.logger.error).toHaveBeenCalledWith('photo.orphaned', {
      cloudinaryId: IMAGE.cloudinaryId,
      error: cloudinaryError,
    })
    expect(deps.logger.info).toHaveBeenCalledWith(
      'photo.deleted',
      expect.objectContaining({ isImageDestroyed: false }),
    )
  })

  it('lets a database failure through without touching Cloudinary', async () => {
    const deps = makeDeps()
    const databaseError = new Error('database is down')
    deps.repository.deleteOwned.mockRejectedValue(databaseError)

    await expect(
      createPhotosService(deps).deletePhoto({ ownerId: OWNER_ID, id: RECORD.id }),
    ).rejects.toBe(databaseError)
    expect(deps.deleteImage).not.toHaveBeenCalled()
  })
})
