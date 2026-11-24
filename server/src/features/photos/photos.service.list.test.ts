import { describe, expect, it, vi } from 'vitest'
import type { Logger } from '../../lib/logger.js'
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from './photos.input.js'
import type { PhotoRecord, PhotosRepository } from './photos.repository.js'
import { createPhotosService, type PhotosServiceDeps } from './photos.service.js'

const OWNER_ID = '6b044f9d56a44767c7079b01'
const CURSOR = '6b044f9d56a44767c7079a05'

function recordWithId(id: string): PhotoRecord {
  return {
    id,
    ownerId: OWNER_ID,
    senderId: null,
    sender: null,
    url: 'https://res.cloudinary.com/demo/photo.jpg',
    cloudinaryId: `familyframe/${id}`,
    sha256: `sha-${id}`,
    createdAt: new Date('2026-11-23T10:00:00Z'),
  }
}

// Newest first, like the repository returns them.
const RECORDS = [
  '6b044f9d56a44767c7079a03',
  '6b044f9d56a44767c7079a02',
  '6b044f9d56a44767c7079a01',
].map(recordWithId)

// Listing only reads findPage: the other fakes stay unused.
function makeDeps() {
  return {
    repository: {
      findPage: vi.fn<PhotosRepository['findPage']>().mockResolvedValue([]),
      findByOwnerAndSha256: vi.fn<PhotosRepository['findByOwnerAndSha256']>(),
      findOwned: vi.fn<PhotosRepository['findOwned']>(),
      create: vi.fn<PhotosRepository['create']>(),
      deleteOwned: vi.fn<PhotosRepository['deleteOwned']>(),
      countByCloudinaryId: vi.fn<PhotosRepository['countByCloudinaryId']>(),
    },
    toFrameJpeg: vi.fn<PhotosServiceDeps['toFrameJpeg']>(),
    uploadImage: vi.fn<PhotosServiceDeps['uploadImage']>(),
    deleteImage: vi.fn<PhotosServiceDeps['deleteImage']>(),
    logger: {
      info: vi.fn<Logger['info']>(),
      warn: vi.fn<Logger['warn']>(),
      error: vi.fn<Logger['error']>(),
    },
  }
}

describe('listPage', () => {
  it('asks for one record more than the default page size', async () => {
    const deps = makeDeps()

    await createPhotosService(deps).listPage({
      ownerId: OWNER_ID,
      cursor: undefined,
      limit: undefined,
    })

    expect(deps.repository.findPage).toHaveBeenCalledWith({
      ownerId: OWNER_ID,
      beforeId: undefined,
      take: DEFAULT_PAGE_SIZE + 1,
    })
  })

  it('accepts the largest page size', async () => {
    const deps = makeDeps()

    await createPhotosService(deps).listPage({
      ownerId: OWNER_ID,
      cursor: undefined,
      limit: String(MAX_PAGE_SIZE),
    })

    expect(deps.repository.findPage).toHaveBeenCalledWith({
      ownerId: OWNER_ID,
      beforeId: undefined,
      take: MAX_PAGE_SIZE + 1,
    })
  })

  it.each([
    ['zero', '0'],
    ['above the largest page size', String(MAX_PAGE_SIZE + 1)],
    ['not a number', 'abc'],
    ['a decimal', '1.5'],
    ['repeated in the query', ['10', '20']],
  ])('rejects a limit that is %s', async (_case, limit) => {
    const deps = makeDeps()

    await expect(
      createPhotosService(deps).listPage({ ownerId: OWNER_ID, cursor: undefined, limit }),
    ).rejects.toMatchObject({ code: 'QUERY_INVALID' })
    expect(deps.repository.findPage).not.toHaveBeenCalled()
  })

  it.each([
    ['not an ObjectId', 'pas-un-id'],
    ['repeated in the query', [CURSOR, CURSOR]],
  ])('rejects a cursor that is %s', async (_case, cursor) => {
    const deps = makeDeps()

    await expect(
      createPhotosService(deps).listPage({ ownerId: OWNER_ID, cursor, limit: undefined }),
    ).rejects.toMatchObject({ code: 'QUERY_INVALID' })
    expect(deps.repository.findPage).not.toHaveBeenCalled()
  })

  it('lists the photos older than a valid cursor', async () => {
    const deps = makeDeps()

    await createPhotosService(deps).listPage({
      ownerId: OWNER_ID,
      cursor: CURSOR,
      limit: undefined,
    })

    expect(deps.repository.findPage).toHaveBeenCalledWith({
      ownerId: OWNER_ID,
      beforeId: CURSOR,
      take: DEFAULT_PAGE_SIZE + 1,
    })
  })

  it('drops the extra record and points the next cursor at the last one kept', async () => {
    const deps = makeDeps()
    deps.repository.findPage.mockResolvedValue(RECORDS)

    const page = await createPhotosService(deps).listPage({
      ownerId: OWNER_ID,
      cursor: undefined,
      limit: '2',
    })

    expect(page).toEqual({ records: RECORDS.slice(0, 2), nextCursor: RECORDS[1].id })
  })

  it('has no next page when no more records than the limit come back', async () => {
    const deps = makeDeps()
    deps.repository.findPage.mockResolvedValue(RECORDS.slice(0, 2))

    const page = await createPhotosService(deps).listPage({
      ownerId: OWNER_ID,
      cursor: undefined,
      limit: '2',
    })

    expect(page).toEqual({ records: RECORDS.slice(0, 2), nextCursor: null })
  })
})
