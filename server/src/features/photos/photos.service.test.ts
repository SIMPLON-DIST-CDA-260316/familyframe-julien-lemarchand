import { describe, expect, it, vi } from 'vitest'
import type { Logger } from '../../lib/logger.js'
import type { PhotoRecord, PhotosRepository } from './photos.repository.js'
import { createPhotosService, type PhotosServiceDeps, type UploadedFile } from './photos.service.js'

const JPEG_FILE: UploadedFile = { buffer: Buffer.from('raw upload'), mimetype: 'image/jpeg' }
const FRAME_JPEG = Buffer.from('frame jpeg')
const IMAGE = { url: 'https://res.cloudinary.com/demo/photo.jpg', cloudinaryId: 'familyframe/abc' }
const RECORD: PhotoRecord = {
  id: '6b044f9d56a44767c7079a01',
  ...IMAGE,
  uploaderName: 'Mamie',
  createdAt: new Date('2026-11-23T10:00:00Z'),
}
const LONGEST_NAME = 'a'.repeat(30)
const TOO_LONG_NAME = 'a'.repeat(31)
const LATEST_PHOTOS_LIMIT = 20

// Every dependency succeeds by default; each test breaks only the one it is about.
function makeDeps() {
  return {
    repository: {
      findLatest: vi.fn<PhotosRepository['findLatest']>().mockResolvedValue([RECORD]),
      create: vi.fn<PhotosRepository['create']>().mockResolvedValue(RECORD),
      deleteById: vi.fn<PhotosRepository['deleteById']>().mockResolvedValue(RECORD),
    },
    toFrameJpeg: vi.fn<PhotosServiceDeps['toFrameJpeg']>().mockResolvedValue(FRAME_JPEG),
    uploadImage: vi.fn<PhotosServiceDeps['uploadImage']>().mockResolvedValue(IMAGE),
    deleteImage: vi.fn<PhotosServiceDeps['deleteImage']>().mockResolvedValue(undefined),
    logger: {
      info: vi.fn<Logger['info']>(),
      warn: vi.fn<Logger['warn']>(),
      error: vi.fn<Logger['error']>(),
    },
  }
}

describe('createPhoto', () => {
  it('saves the uploaded image with the trimmed name and returns the record', async () => {
    const deps = makeDeps()

    const record = await createPhotosService(deps).createPhoto({
      uploaderName: '  Mamie  ',
      file: JPEG_FILE,
    })

    expect(record).toBe(RECORD)
    expect(deps.toFrameJpeg).toHaveBeenCalledWith(JPEG_FILE.buffer)
    expect(deps.uploadImage).toHaveBeenCalledWith(FRAME_JPEG)
    expect(deps.repository.create).toHaveBeenCalledWith({ ...IMAGE, uploaderName: 'Mamie' })
  })

  it('logs the created photo by its identifiers, never by its uploader name', async () => {
    const deps = makeDeps()

    await createPhotosService(deps).createPhoto({ uploaderName: 'Mamie', file: JPEG_FILE })

    expect(deps.logger.info).toHaveBeenCalledWith('photo.created', {
      photoId: RECORD.id,
      cloudinaryId: RECORD.cloudinaryId,
    })
    expect(JSON.stringify(deps.logger.info.mock.calls)).not.toContain('Mamie')
  })

  it('accepts a 30-character name', async () => {
    const deps = makeDeps()

    await createPhotosService(deps).createPhoto({ uploaderName: LONGEST_NAME, file: JPEG_FILE })

    expect(deps.repository.create).toHaveBeenCalledWith({ ...IMAGE, uploaderName: LONGEST_NAME })
  })

  it.each([
    ['empty', ''],
    ['only spaces', '   '],
    ['31 characters long', TOO_LONG_NAME],
    ['not a string', 42],
    ['missing', undefined],
  ])('rejects a name that is %s before any image work', async (_label, uploaderName) => {
    const deps = makeDeps()

    await expect(
      createPhotosService(deps).createPhoto({ uploaderName, file: JPEG_FILE }),
    ).rejects.toMatchObject({ code: 'UPLOADER_NAME_INVALID' })
    expect(deps.toFrameJpeg).not.toHaveBeenCalled()
  })

  it('rejects a missing file', async () => {
    const deps = makeDeps()

    await expect(
      createPhotosService(deps).createPhoto({ uploaderName: 'Mamie', file: undefined }),
    ).rejects.toMatchObject({ code: 'PHOTO_MISSING' })
  })

  it('rejects a format other than JPEG, PNG or WebP', async () => {
    const deps = makeDeps()
    const gif: UploadedFile = { buffer: Buffer.from('gif'), mimetype: 'image/gif' }

    await expect(
      createPhotosService(deps).createPhoto({ uploaderName: 'Mamie', file: gif }),
    ).rejects.toMatchObject({ code: 'FORMAT_UNSUPPORTED' })
    expect(deps.toFrameJpeg).not.toHaveBeenCalled()
  })

  it.each(['image/png', 'image/webp'])('accepts %s', async (mimetype) => {
    const deps = makeDeps()
    const file: UploadedFile = { buffer: Buffer.from('image'), mimetype }

    await createPhotosService(deps).createPhoto({ uploaderName: 'Mamie', file })

    expect(deps.toFrameJpeg).toHaveBeenCalledWith(file.buffer)
  })

  it('turns an image sharp cannot read into IMAGE_UNREADABLE and logs the sharp error', async () => {
    const deps = makeDeps()
    const sharpError = new Error('Input buffer contains unsupported image format')
    deps.toFrameJpeg.mockRejectedValue(sharpError)

    await expect(
      createPhotosService(deps).createPhoto({ uploaderName: 'Mamie', file: JPEG_FILE }),
    ).rejects.toMatchObject({ code: 'IMAGE_UNREADABLE' })
    expect(deps.uploadImage).not.toHaveBeenCalled()
    expect(deps.logger.warn).toHaveBeenCalledWith('photo.unreadable', { error: sharpError })
  })

  it('lets a Cloudinary failure through unchanged', async () => {
    const deps = makeDeps()
    const cloudinaryError = new Error('Cloudinary is down')
    deps.uploadImage.mockRejectedValue(cloudinaryError)

    await expect(
      createPhotosService(deps).createPhoto({ uploaderName: 'Mamie', file: JPEG_FILE }),
    ).rejects.toBe(cloudinaryError)
    expect(deps.repository.create).not.toHaveBeenCalled()
  })

  it('logs the orphaned Cloudinary image when the database fails', async () => {
    const deps = makeDeps()
    const databaseError = new Error('database is down')
    deps.repository.create.mockRejectedValue(databaseError)

    await expect(
      createPhotosService(deps).createPhoto({ uploaderName: 'Mamie', file: JPEG_FILE }),
    ).rejects.toBe(databaseError)
    expect(deps.logger.error).toHaveBeenCalledWith('photo.orphaned', {
      cloudinaryId: IMAGE.cloudinaryId,
      error: databaseError,
    })
    expect(deps.logger.info).not.toHaveBeenCalled()
  })
})

describe('listLatest', () => {
  it('returns the latest photos from the repository', async () => {
    const deps = makeDeps()

    const records = await createPhotosService(deps).listLatest()

    expect(records).toEqual([RECORD])
    expect(deps.repository.findLatest).toHaveBeenCalledWith(LATEST_PHOTOS_LIMIT)
  })
})

describe('deletePhoto', () => {
  it('deletes the record, then its Cloudinary image, and returns the stored id', async () => {
    const deps = makeDeps()

    const deletedId = await createPhotosService(deps).deletePhoto(RECORD.id)

    expect(deletedId).toBe(RECORD.id)
    expect(deps.repository.deleteById).toHaveBeenCalledWith(RECORD.id)
    expect(deps.deleteImage).toHaveBeenCalledWith(IMAGE.cloudinaryId)
    expect(deps.repository.deleteById.mock.invocationCallOrder[0]).toBeLessThan(
      deps.deleteImage.mock.invocationCallOrder[0],
    )
  })

  it('logs the deleted photo by its identifiers', async () => {
    const deps = makeDeps()

    await createPhotosService(deps).deletePhoto(RECORD.id)

    expect(deps.logger.info).toHaveBeenCalledWith('photo.deleted', {
      photoId: RECORD.id,
      cloudinaryId: RECORD.cloudinaryId,
    })
  })

  it('returns the stored id when the URL has it in upper case', async () => {
    const deps = makeDeps()

    const deletedId = await createPhotosService(deps).deletePhoto(RECORD.id.toUpperCase())

    expect(deletedId).toBe(RECORD.id)
  })

  it('rejects an id with no record, also when another request deleted it first', async () => {
    const deps = makeDeps()
    deps.repository.deleteById.mockResolvedValue(null)

    await expect(createPhotosService(deps).deletePhoto(RECORD.id)).rejects.toMatchObject({
      code: 'PHOTO_NOT_FOUND',
    })
    expect(deps.deleteImage).not.toHaveBeenCalled()
  })

  it('rejects an id that is not an ObjectId without querying the database', async () => {
    const deps = makeDeps()

    await expect(createPhotosService(deps).deletePhoto('abc')).rejects.toMatchObject({
      code: 'PHOTO_NOT_FOUND',
    })
    expect(deps.repository.deleteById).not.toHaveBeenCalled()
  })

  it('still succeeds when Cloudinary fails, and logs the orphaned image', async () => {
    const deps = makeDeps()
    const cloudinaryError = new Error('Cloudinary is down')
    deps.deleteImage.mockRejectedValue(cloudinaryError)

    await expect(createPhotosService(deps).deletePhoto(RECORD.id)).resolves.toBe(RECORD.id)
    expect(deps.logger.error).toHaveBeenCalledWith('photo.orphaned', {
      cloudinaryId: IMAGE.cloudinaryId,
      error: cloudinaryError,
    })
  })

  it('lets a database failure through without touching Cloudinary', async () => {
    const deps = makeDeps()
    const databaseError = new Error('database is down')
    deps.repository.deleteById.mockRejectedValue(databaseError)

    await expect(createPhotosService(deps).deletePhoto(RECORD.id)).rejects.toBe(databaseError)
    expect(deps.deleteImage).not.toHaveBeenCalled()
  })
})
