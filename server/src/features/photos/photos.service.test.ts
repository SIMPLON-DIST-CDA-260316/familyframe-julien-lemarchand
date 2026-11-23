import { afterEach, describe, expect, it, vi } from 'vitest'
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
    },
    toFrameJpeg: vi.fn<PhotosServiceDeps['toFrameJpeg']>().mockResolvedValue(FRAME_JPEG),
    uploadImage: vi.fn<PhotosServiceDeps['uploadImage']>().mockResolvedValue(IMAGE),
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

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

  it('turns an image sharp cannot read into IMAGE_UNREADABLE', async () => {
    const deps = makeDeps()
    deps.toFrameJpeg.mockRejectedValue(new Error('Input buffer contains unsupported image format'))

    await expect(
      createPhotosService(deps).createPhoto({ uploaderName: 'Mamie', file: JPEG_FILE }),
    ).rejects.toMatchObject({ code: 'IMAGE_UNREADABLE' })
    expect(deps.uploadImage).not.toHaveBeenCalled()
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
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await expect(
      createPhotosService(deps).createPhoto({ uploaderName: 'Mamie', file: JPEG_FILE }),
    ).rejects.toBe(databaseError)
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining(IMAGE.cloudinaryId))
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
