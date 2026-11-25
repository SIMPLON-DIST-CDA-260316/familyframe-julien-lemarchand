import { describe, expect, it, vi } from 'vitest'
import type { Logger } from '../../lib/logger.js'
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from './photos.input.js'
import type { PhotoRecord, PhotosRepository } from './photos.repository.js'
import { createPhotosService, type PhotosServiceDeps } from './photos.service.js'

const OWNER_ID = '6b044f9d56a44767c7079b01'
const CURSOR = '6b044f9d56a44767c7079a05'
const COLLECTION_ID = '6b044f9d56a44767c7079c01'

function recordWithId(id: string): PhotoRecord {
  return {
    id,
    ownerId: OWNER_ID,
    senderId: null,
    message: null,
    isOpened: true,
    openedAt: null,
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

// Listing only reads findPage and findCollectionPhotoIds: the other fakes stay unused.
function makeDeps() {
  return {
    repository: {
      findPage: vi.fn<PhotosRepository['findPage']>().mockResolvedValue([]),
      findByOwnerAndSha256: vi.fn<PhotosRepository['findByOwnerAndSha256']>(),
      findOwned: vi.fn<PhotosRepository['findOwned']>(),
      create: vi.fn<PhotosRepository['create']>(),
      deleteOwned: vi.fn<PhotosRepository['deleteOwned']>(),
      openOwned: vi.fn<PhotosRepository['openOwned']>(),
      findUnopened: vi.fn<PhotosRepository['findUnopened']>(),
      countImageUses: vi.fn<PhotosRepository['countImageUses']>(),
      findCollectionPhotoIds: vi
        .fn<PhotosRepository['findCollectionPhotoIds']>()
        .mockResolvedValue([RECORDS[0].id]),
    },
    toFrameJpeg: vi.fn<PhotosServiceDeps['toFrameJpeg']>(),
    uploadImage: vi.fn<PhotosServiceDeps['uploadImage']>(),
    deleteImage: vi.fn<PhotosServiceDeps['deleteImage']>(),
    areFriends: vi.fn<PhotosServiceDeps['areFriends']>(),
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
      collectionId: undefined,
    })

    expect(deps.repository.findPage).toHaveBeenCalledWith({
      ownerId: OWNER_ID,
      beforeId: undefined,
      take: DEFAULT_PAGE_SIZE + 1,
      photoIds: undefined,
    })
  })

  it('accepts the largest page size', async () => {
    const deps = makeDeps()

    await createPhotosService(deps).listPage({
      ownerId: OWNER_ID,
      cursor: undefined,
      limit: String(MAX_PAGE_SIZE),
      collectionId: undefined,
    })

    expect(deps.repository.findPage).toHaveBeenCalledWith({
      ownerId: OWNER_ID,
      beforeId: undefined,
      take: MAX_PAGE_SIZE + 1,
      photoIds: undefined,
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
      createPhotosService(deps).listPage({
        ownerId: OWNER_ID,
        cursor: undefined,
        limit,
        collectionId: undefined,
      }),
    ).rejects.toMatchObject({ code: 'QUERY_INVALID' })
    expect(deps.repository.findPage).not.toHaveBeenCalled()
  })

  it.each([
    ['not an ObjectId', 'pas-un-id'],
    ['repeated in the query', [CURSOR, CURSOR]],
  ])('rejects a cursor that is %s', async (_case, cursor) => {
    const deps = makeDeps()

    await expect(
      createPhotosService(deps).listPage({
        ownerId: OWNER_ID,
        cursor,
        limit: undefined,
        collectionId: undefined,
      }),
    ).rejects.toMatchObject({ code: 'QUERY_INVALID' })
    expect(deps.repository.findPage).not.toHaveBeenCalled()
  })

  it('lists the photos older than a valid cursor', async () => {
    const deps = makeDeps()

    await createPhotosService(deps).listPage({
      ownerId: OWNER_ID,
      cursor: CURSOR,
      limit: undefined,
      collectionId: undefined,
    })

    expect(deps.repository.findPage).toHaveBeenCalledWith({
      ownerId: OWNER_ID,
      beforeId: CURSOR,
      take: DEFAULT_PAGE_SIZE + 1,
      photoIds: undefined,
    })
  })

  it('drops the extra record and points the next cursor at the last one kept', async () => {
    const deps = makeDeps()
    deps.repository.findPage.mockResolvedValue(RECORDS)

    const page = await createPhotosService(deps).listPage({
      ownerId: OWNER_ID,
      cursor: undefined,
      limit: '2',
      collectionId: undefined,
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
      collectionId: undefined,
    })

    expect(page).toEqual({ records: RECORDS.slice(0, 2), nextCursor: null })
  })

  it("lists only the photos of one of the owner's collections", async () => {
    const deps = makeDeps()

    await createPhotosService(deps).listPage({
      ownerId: OWNER_ID,
      cursor: CURSOR,
      limit: undefined,
      collectionId: COLLECTION_ID,
    })

    expect(deps.repository.findCollectionPhotoIds).toHaveBeenCalledWith(COLLECTION_ID, OWNER_ID)
    expect(deps.repository.findPage).toHaveBeenCalledWith({
      ownerId: OWNER_ID,
      beforeId: CURSOR,
      take: DEFAULT_PAGE_SIZE + 1,
      photoIds: [RECORDS[0].id],
    })
  })

  it("answers an unknown or someone else's collection like a missing one", async () => {
    const deps = makeDeps()
    deps.repository.findCollectionPhotoIds.mockResolvedValue(null)

    await expect(
      createPhotosService(deps).listPage({
        ownerId: OWNER_ID,
        cursor: undefined,
        limit: undefined,
        collectionId: COLLECTION_ID,
      }),
    ).rejects.toMatchObject({ code: 'COLLECTION_NOT_FOUND' })
    expect(deps.repository.findPage).not.toHaveBeenCalled()
  })

  it('answers a collection id that is not an ObjectId like a missing one', async () => {
    const deps = makeDeps()

    await expect(
      createPhotosService(deps).listPage({
        ownerId: OWNER_ID,
        cursor: undefined,
        limit: undefined,
        collectionId: 'pas-un-id',
      }),
    ).rejects.toMatchObject({ code: 'COLLECTION_NOT_FOUND' })
    expect(deps.repository.findCollectionPhotoIds).not.toHaveBeenCalled()
  })

  it('rejects a collection id repeated in the query', async () => {
    const deps = makeDeps()

    await expect(
      createPhotosService(deps).listPage({
        ownerId: OWNER_ID,
        cursor: undefined,
        limit: undefined,
        collectionId: [COLLECTION_ID, COLLECTION_ID],
      }),
    ).rejects.toMatchObject({ code: 'QUERY_INVALID' })
    expect(deps.repository.findCollectionPhotoIds).not.toHaveBeenCalled()
  })
})
