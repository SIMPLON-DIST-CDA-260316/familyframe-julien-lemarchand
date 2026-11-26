import { describe, expect, it, vi } from 'vitest'
import { AppError } from '../../errors/app-error.js'
import type { Logger } from '../../lib/logger.js'
import type {
  CollectionRecord,
  CollectionsRepository,
  LivePhoto,
} from './collections.repository.js'
import { createCollectionsService } from './collections.service.js'

const OWNER_ID = '6b044f9d56a44767c7079b02'
const IN_ID = '6b044f9d56a44767c7079a01'
const FIRST_ID = '6b044f9d56a44767c7079a02'
const SECOND_ID = '6b044f9d56a44767c7079a03'
const ADDED_ELSEWHERE_ID = '6b044f9d56a44767c7079a04'
const NOEL: CollectionRecord = {
  id: '6b044f9d56a44767c7079c01',
  ownerId: OWNER_ID,
  name: 'Noël',
  photoIds: [IN_ID],
  createdAt: new Date('2026-11-25T10:00:00Z'),
}
const ALL_IDS = [IN_ID, FIRST_ID, SECOND_ID, ADDED_ELSEWHERE_ID]
const ADDITION = { id: NOEL.id, ownerId: OWNER_ID, photoIds: [SECOND_ID, IN_ID, FIRST_ID] }

function livePhoto(id: string): LivePhoto {
  return { id, cloudinaryId: `familyframe/${id}`, createdAt: new Date('2026-11-20T10:00:00Z') }
}

// Every photo is the owner's and opened, and the list does not change in between, by default.
function makeDeps() {
  return {
    repository: {
      findAllOf: vi.fn<CollectionsRepository['findAllOf']>(),
      findLivePhotos: vi
        .fn<CollectionsRepository['findLivePhotos']>()
        .mockResolvedValue(ALL_IDS.map(livePhoto)),
      create: vi.fn<CollectionsRepository['create']>(),
      rename: vi.fn<CollectionsRepository['rename']>(),
      deleteOwned: vi.fn<CollectionsRepository['deleteOwned']>(),
      findOwned: vi.fn<CollectionsRepository['findOwned']>().mockResolvedValue(NOEL),
      hasOpenedPhoto: vi.fn<CollectionsRepository['hasOpenedPhoto']>(),
      countOpenedPhotos: vi
        .fn<CollectionsRepository['countOpenedPhotos']>()
        .mockImplementation(async (_ownerId, photoIds) => photoIds.length),
      addPhoto: vi.fn<CollectionsRepository['addPhoto']>(),
      setPhotoIds: vi
        .fn<CollectionsRepository['setPhotoIds']>()
        .mockImplementation(async (_id, _ownerId, _readIds, photoIds) => ({ ...NOEL, photoIds })),
    },
    logger: {
      info: vi.fn<Logger['info']>(),
      warn: vi.fn<Logger['warn']>(),
      error: vi.fn<Logger['error']>(),
    },
    thumbnailUrl: (cloudinaryId: string) => `thumb:${cloudinaryId}`,
  }
}

describe('addPhotos', () => {
  it('appends the photos not in yet, in the order chosen, and logs how many', async () => {
    const deps = makeDeps()

    const collection = await createCollectionsService(deps).addPhotos(ADDITION)

    expect(deps.repository.setPhotoIds).toHaveBeenCalledWith(
      NOEL.id,
      OWNER_ID,
      [IN_ID],
      [IN_ID, SECOND_ID, FIRST_ID],
    )
    expect(collection.photoIds).toEqual([IN_ID, SECOND_ID, FIRST_ID])
    expect(deps.logger.info).toHaveBeenCalledWith('collection.photos_added', {
      collectionId: NOEL.id,
      count: 2,
      userId: OWNER_ID,
    })
  })

  it('answers photos all already in with the collection as it is, without a write or a log', async () => {
    const deps = makeDeps()

    const collection = await createCollectionsService(deps).addPhotos({
      ...ADDITION,
      photoIds: [IN_ID],
    })

    expect(collection.photoIds).toEqual([IN_ID])
    expect(deps.repository.setPhotoIds).not.toHaveBeenCalled()
    expect(deps.logger.info).not.toHaveBeenCalled()
  })

  it("refuses the whole list for one unknown, someone else's or unopened photo, before any write", async () => {
    const deps = makeDeps()
    deps.repository.countOpenedPhotos.mockResolvedValue(2)

    const addition = createCollectionsService(deps).addPhotos(ADDITION)

    await expect(addition).rejects.toThrow(new AppError('PHOTO_NOT_FOUND'))
    expect(deps.repository.findOwned).not.toHaveBeenCalled()
    expect(deps.repository.setPhotoIds).not.toHaveBeenCalled()
  })

  it('refuses a body without a list of ids before reading anything', async () => {
    const deps = makeDeps()

    const addition = createCollectionsService(deps).addPhotos({ ...ADDITION, photoIds: [] })

    await expect(addition).rejects.toThrow(new AppError('BODY_INVALID'))
    expect(deps.repository.countOpenedPhotos).not.toHaveBeenCalled()
  })

  it("answers a malformed, unknown or someone else's collection as not found", async () => {
    const deps = makeDeps()
    deps.repository.findOwned.mockResolvedValue(null)
    const service = createCollectionsService(deps)

    await expect(service.addPhotos({ ...ADDITION, id: 'nope' })).rejects.toThrow(
      new AppError('COLLECTION_NOT_FOUND'),
    )
    await expect(service.addPhotos(ADDITION)).rejects.toThrow(new AppError('COLLECTION_NOT_FOUND'))
  })

  it('keeps a photo added from another device between the read and the write', async () => {
    const deps = makeDeps()
    const withAdded = { ...NOEL, photoIds: [IN_ID, ADDED_ELSEWHERE_ID] }
    deps.repository.findOwned.mockResolvedValueOnce(NOEL).mockResolvedValueOnce(withAdded)
    deps.repository.setPhotoIds.mockResolvedValueOnce(null)

    const collection = await createCollectionsService(deps).addPhotos(ADDITION)

    expect(collection.photoIds).toEqual([IN_ID, ADDED_ELSEWHERE_ID, SECOND_ID, FIRST_ID])
    expect(deps.logger.info).toHaveBeenCalledTimes(1)
  })

  it('gives up after one retry when the list keeps changing, without a log', async () => {
    const deps = makeDeps()
    deps.repository.setPhotoIds.mockResolvedValue(null)

    const addition = createCollectionsService(deps).addPhotos(ADDITION)

    await expect(addition).rejects.toThrow('Collection kept changing')
    expect(deps.repository.setPhotoIds).toHaveBeenCalledTimes(2)
    expect(deps.logger.info).not.toHaveBeenCalled()
  })
})
