import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import type { Logger } from '../../lib/logger.js'
import type { UploadedFile } from './photos.input.js'
import type { PhotoRecord, PhotosRepository } from './photos.repository.js'
import { createPhotosService, type PhotosServiceDeps } from './photos.service.js'

const OWNER_ID = '6b044f9d56a44767c7079b01'
const JPEG_FILE: UploadedFile = { buffer: Buffer.from('raw upload'), mimetype: 'image/jpeg' }
// Computed like the service does: the hash of the original upload bytes.
const JPEG_SHA256 = createHash('sha256').update(JPEG_FILE.buffer).digest('hex')
const FRAME_JPEG = Buffer.from('frame jpeg')
const IMAGE = { url: 'https://res.cloudinary.com/demo/photo.jpg', cloudinaryId: 'familyframe/abc' }
const RECORD: PhotoRecord = {
  id: '6b044f9d56a44767c7079a01',
  ownerId: OWNER_ID,
  senderId: null,
  sender: null,
  ...IMAGE,
  sha256: JPEG_SHA256,
  createdAt: new Date('2026-11-23T10:00:00Z'),
}

// Every dependency succeeds by default; each test breaks only the one it is about.
function makeDeps() {
  return {
    repository: {
      findPage: vi.fn<PhotosRepository['findPage']>().mockResolvedValue([RECORD]),
      findByOwnerAndSha256: vi
        .fn<PhotosRepository['findByOwnerAndSha256']>()
        .mockResolvedValue(null),
      findOwned: vi.fn<PhotosRepository['findOwned']>(),
      create: vi.fn<PhotosRepository['create']>().mockResolvedValue(RECORD),
      deleteOwned: vi.fn<PhotosRepository['deleteOwned']>().mockResolvedValue(RECORD),
      countByCloudinaryId: vi.fn<PhotosRepository['countByCloudinaryId']>().mockResolvedValue(0),
    },
    toFrameJpeg: vi.fn<PhotosServiceDeps['toFrameJpeg']>().mockResolvedValue(FRAME_JPEG),
    uploadImage: vi.fn<PhotosServiceDeps['uploadImage']>().mockResolvedValue(IMAGE),
    deleteImage: vi.fn<PhotosServiceDeps['deleteImage']>().mockResolvedValue(undefined),
    areFriends: vi.fn<PhotosServiceDeps['areFriends']>(),
    logger: {
      info: vi.fn<Logger['info']>(),
      warn: vi.fn<Logger['warn']>(),
      error: vi.fn<Logger['error']>(),
    },
  }
}

describe('createPhoto', () => {
  it('saves the uploaded image for its owner with the hash of the original bytes', async () => {
    const deps = makeDeps()

    const record = await createPhotosService(deps).createPhoto({
      ownerId: OWNER_ID,
      file: JPEG_FILE,
    })

    expect(record).toBe(RECORD)
    expect(deps.repository.findByOwnerAndSha256).toHaveBeenCalledWith(OWNER_ID, JPEG_SHA256)
    expect(deps.toFrameJpeg).toHaveBeenCalledWith(JPEG_FILE.buffer)
    expect(deps.uploadImage).toHaveBeenCalledWith(FRAME_JPEG)
    // Not the hash of FRAME_JPEG: sharp's output is not guaranteed to be stable.
    expect(deps.repository.create).toHaveBeenCalledWith({
      ownerId: OWNER_ID,
      ...IMAGE,
      sha256: JPEG_SHA256,
    })
  })

  it('logs the created photo by its identifiers and its owner id', async () => {
    const deps = makeDeps()

    await createPhotosService(deps).createPhoto({ ownerId: OWNER_ID, file: JPEG_FILE })

    expect(deps.logger.info).toHaveBeenCalledWith('photo.created', {
      photoId: RECORD.id,
      cloudinaryId: RECORD.cloudinaryId,
      userId: OWNER_ID,
    })
  })

  it('rejects a file already in the library before any image work', async () => {
    const deps = makeDeps()
    deps.repository.findByOwnerAndSha256.mockResolvedValue(RECORD)

    await expect(
      createPhotosService(deps).createPhoto({ ownerId: OWNER_ID, file: JPEG_FILE }),
    ).rejects.toMatchObject({ code: 'PHOTO_DUPLICATE' })
    expect(deps.toFrameJpeg).not.toHaveBeenCalled()
    expect(deps.uploadImage).not.toHaveBeenCalled()
    expect(deps.logger.info).toHaveBeenCalledWith('photo.duplicate', {
      userId: OWNER_ID,
      photoId: RECORD.id,
    })
  })

  it('rejects a duplicate a concurrent upload saved first, and destroys the new image', async () => {
    const deps = makeDeps()
    deps.repository.create.mockResolvedValue(null)

    await expect(
      createPhotosService(deps).createPhoto({ ownerId: OWNER_ID, file: JPEG_FILE }),
    ).rejects.toMatchObject({ code: 'PHOTO_DUPLICATE' })
    expect(deps.deleteImage).toHaveBeenCalledWith(IMAGE.cloudinaryId)
    expect(deps.logger.info).toHaveBeenCalledWith('photo.duplicate', {
      userId: OWNER_ID,
      cloudinaryId: IMAGE.cloudinaryId,
    })
    expect(deps.logger.info).not.toHaveBeenCalledWith('photo.created', expect.anything())
  })

  it('rejects a missing file', async () => {
    const deps = makeDeps()

    await expect(
      createPhotosService(deps).createPhoto({ ownerId: OWNER_ID, file: undefined }),
    ).rejects.toMatchObject({ code: 'PHOTO_MISSING' })
  })

  it('rejects a format other than JPEG, PNG or WebP', async () => {
    const deps = makeDeps()
    const gif: UploadedFile = { buffer: Buffer.from('gif'), mimetype: 'image/gif' }

    await expect(
      createPhotosService(deps).createPhoto({ ownerId: OWNER_ID, file: gif }),
    ).rejects.toMatchObject({ code: 'FORMAT_UNSUPPORTED' })
    expect(deps.toFrameJpeg).not.toHaveBeenCalled()
  })

  it.each(['image/png', 'image/webp'])('accepts %s', async (mimetype) => {
    const deps = makeDeps()
    const file: UploadedFile = { buffer: Buffer.from('image'), mimetype }

    await createPhotosService(deps).createPhoto({ ownerId: OWNER_ID, file })

    expect(deps.toFrameJpeg).toHaveBeenCalledWith(file.buffer)
  })

  it('turns an image sharp cannot read into IMAGE_UNREADABLE and logs the sharp error', async () => {
    const deps = makeDeps()
    const sharpError = new Error('Input buffer contains unsupported image format')
    deps.toFrameJpeg.mockRejectedValue(sharpError)

    await expect(
      createPhotosService(deps).createPhoto({ ownerId: OWNER_ID, file: JPEG_FILE }),
    ).rejects.toMatchObject({ code: 'IMAGE_UNREADABLE' })
    expect(deps.uploadImage).not.toHaveBeenCalled()
    expect(deps.logger.warn).toHaveBeenCalledWith('photo.unreadable', { error: sharpError })
  })

  it('lets a Cloudinary failure through unchanged', async () => {
    const deps = makeDeps()
    const cloudinaryError = new Error('Cloudinary is down')
    deps.uploadImage.mockRejectedValue(cloudinaryError)

    await expect(
      createPhotosService(deps).createPhoto({ ownerId: OWNER_ID, file: JPEG_FILE }),
    ).rejects.toBe(cloudinaryError)
    expect(deps.repository.create).not.toHaveBeenCalled()
  })

  it('logs the orphaned Cloudinary image when the database fails', async () => {
    const deps = makeDeps()
    const databaseError = new Error('database is down')
    deps.repository.create.mockRejectedValue(databaseError)

    await expect(
      createPhotosService(deps).createPhoto({ ownerId: OWNER_ID, file: JPEG_FILE }),
    ).rejects.toBe(databaseError)
    expect(deps.logger.error).toHaveBeenCalledWith('photo.orphaned', {
      cloudinaryId: IMAGE.cloudinaryId,
      error: databaseError,
    })
    expect(deps.logger.info).not.toHaveBeenCalled()
    expect(deps.deleteImage).not.toHaveBeenCalled()
  })
})
