import { describe, expect, it, vi } from 'vitest'
import { AppError } from '../../errors/app-error.js'
import type { Logger } from '../../lib/logger.js'
import type { CollectionRecord, CollectionsRepository } from './collections.repository.js'
import { createCollectionsService } from './collections.service.js'

const OWNER_ID = '6b044f9d56a44767c7079b02'
const PHOTO_ID = '6b044f9d56a44767c7079a01'
const OTHER_PHOTO_ID = '6b044f9d56a44767c7079a02'
const DELETED_PHOTO_ID = '6b044f9d56a44767c7079a09'
const ADDED_ELSEWHERE_ID = '6b044f9d56a44767c7079a03'
const NOEL: CollectionRecord = {
  id: '6b044f9d56a44767c7079c01',
  ownerId: OWNER_ID,
  name: 'Noël',
  photoIds: [OTHER_PHOTO_ID],
  createdAt: new Date('2026-11-25T10:00:00Z'),
}
const WITH_PHOTO: CollectionRecord = { ...NOEL, photoIds: [OTHER_PHOTO_ID, PHOTO_ID] }
const MEMBERSHIP = { id: NOEL.id, ownerId: OWNER_ID, photoId: PHOTO_ID }

// Every dependency succeeds by default; each test breaks only the one it is about.
function makeDeps() {
  return {
    repository: {
      findAllOf: vi.fn<CollectionsRepository['findAllOf']>(),
      findLivePhotoIds: vi
        .fn<CollectionsRepository['findLivePhotoIds']>()
        .mockResolvedValue([PHOTO_ID, OTHER_PHOTO_ID]),
      create: vi.fn<CollectionsRepository['create']>(),
      rename: vi.fn<CollectionsRepository['rename']>(),
      deleteOwned: vi.fn<CollectionsRepository['deleteOwned']>(),
      findOwned: vi.fn<CollectionsRepository['findOwned']>().mockResolvedValue(NOEL),
      hasOpenedPhoto: vi.fn<CollectionsRepository['hasOpenedPhoto']>().mockResolvedValue(true),
      addPhoto: vi.fn<CollectionsRepository['addPhoto']>().mockResolvedValue(WITH_PHOTO),
      setPhotoIds: vi.fn<CollectionsRepository['setPhotoIds']>().mockResolvedValue(NOEL),
    },
    logger: {
      info: vi.fn<Logger['info']>(),
      warn: vi.fn<Logger['warn']>(),
      error: vi.fn<Logger['error']>(),
    },
  }
}

describe('addPhoto', () => {
  it('adds the photo at the end and logs it by identifiers', async () => {
    const deps = makeDeps()

    const collection = await createCollectionsService(deps).addPhoto(MEMBERSHIP)

    expect(deps.repository.addPhoto).toHaveBeenCalledWith(NOEL.id, OWNER_ID, PHOTO_ID)
    expect(collection.photoIds).toEqual([OTHER_PHOTO_ID, PHOTO_ID])
    expect(deps.logger.info).toHaveBeenCalledWith('collection.photo_added', {
      collectionId: NOEL.id,
      photoId: PHOTO_ID,
      userId: OWNER_ID,
    })
  })

  it('answers a photo already in with the collection as it is, without a log', async () => {
    const deps = makeDeps()
    deps.repository.addPhoto.mockResolvedValue(null)
    deps.repository.findOwned.mockResolvedValue(WITH_PHOTO)

    const collection = await createCollectionsService(deps).addPhoto(MEMBERSHIP)

    expect(collection.photoIds).toEqual([OTHER_PHOTO_ID, PHOTO_ID])
    expect(deps.logger.info).not.toHaveBeenCalled()
  })

  it("refuses an unknown, someone else's or unopened photo, before any write", async () => {
    const deps = makeDeps()
    deps.repository.hasOpenedPhoto.mockResolvedValue(false)

    const addition = createCollectionsService(deps).addPhoto(MEMBERSHIP)

    await expect(addition).rejects.toThrow(new AppError('PHOTO_NOT_FOUND'))
    expect(deps.repository.hasOpenedPhoto).toHaveBeenCalledWith(OWNER_ID, PHOTO_ID)
    expect(deps.repository.addPhoto).not.toHaveBeenCalled()
  })

  it("answers an unknown or someone else's collection as not found", async () => {
    const deps = makeDeps()
    deps.repository.addPhoto.mockResolvedValue(null)
    deps.repository.findOwned.mockResolvedValue(null)

    const addition = createCollectionsService(deps).addPhoto(MEMBERSHIP)

    await expect(addition).rejects.toThrow(new AppError('COLLECTION_NOT_FOUND'))
  })

  it.each([
    ['collection', { ...MEMBERSHIP, id: 'abc' }, 'COLLECTION_NOT_FOUND'],
    ['photo', { ...MEMBERSHIP, photoId: 'abc' }, 'PHOTO_NOT_FOUND'],
  ])('answers a malformed %s id as not found, without a query', async (_id, membership, code) => {
    const deps = makeDeps()

    const addition = createCollectionsService(deps).addPhoto(membership)

    await expect(addition).rejects.toThrow(code)
    expect(deps.repository.hasOpenedPhoto).not.toHaveBeenCalled()
  })
})

describe('removePhoto', () => {
  it('writes the list back without the photo and logs it by identifiers', async () => {
    const deps = makeDeps()
    deps.repository.findOwned.mockResolvedValue(WITH_PHOTO)

    const collection = await createCollectionsService(deps).removePhoto(MEMBERSHIP)

    expect(deps.repository.setPhotoIds).toHaveBeenCalledWith(
      NOEL.id,
      OWNER_ID,
      [OTHER_PHOTO_ID, PHOTO_ID],
      [OTHER_PHOTO_ID],
    )
    expect(collection.photoIds).toEqual([OTHER_PHOTO_ID])
    expect(deps.logger.info).toHaveBeenCalledWith('collection.photo_removed', {
      collectionId: NOEL.id,
      photoId: PHOTO_ID,
      userId: OWNER_ID,
    })
  })

  it('finds a photo id sent in capitals, as MongoDB answers it in lowercase', async () => {
    const deps = makeDeps()
    deps.repository.findOwned.mockResolvedValue(WITH_PHOTO)

    await createCollectionsService(deps).removePhoto({
      ...MEMBERSHIP,
      photoId: PHOTO_ID.toUpperCase(),
    })

    expect(deps.repository.setPhotoIds).toHaveBeenCalledWith(
      NOEL.id,
      OWNER_ID,
      [OTHER_PHOTO_ID, PHOTO_ID],
      [OTHER_PHOTO_ID],
    )
    expect(deps.logger.info).toHaveBeenCalledWith('collection.photo_removed', {
      collectionId: NOEL.id,
      photoId: PHOTO_ID,
      userId: OWNER_ID,
    })
  })

  it('answers a photo that is not in the collection with the collection as it is', async () => {
    const deps = makeDeps()

    const collection = await createCollectionsService(deps).removePhoto(MEMBERSHIP)

    expect(collection.photoIds).toEqual([OTHER_PHOTO_ID])
    expect(deps.repository.setPhotoIds).not.toHaveBeenCalled()
    expect(deps.logger.info).not.toHaveBeenCalled()
  })

  it("answers an unknown or someone else's collection as not found", async () => {
    const deps = makeDeps()
    deps.repository.findOwned.mockResolvedValue(null)

    const removal = createCollectionsService(deps).removePhoto(MEMBERSHIP)

    await expect(removal).rejects.toThrow(new AppError('COLLECTION_NOT_FOUND'))
  })

  it('answers a collection deleted between the read and the write as not found', async () => {
    const deps = makeDeps()
    deps.repository.findOwned.mockResolvedValueOnce(WITH_PHOTO).mockResolvedValueOnce(null)
    deps.repository.setPhotoIds.mockResolvedValue(null)

    const removal = createCollectionsService(deps).removePhoto(MEMBERSHIP)

    await expect(removal).rejects.toThrow(new AppError('COLLECTION_NOT_FOUND'))
  })

  it('keeps a photo added from another device between the read and the write', async () => {
    const deps = makeDeps()
    const withAdded = { ...WITH_PHOTO, photoIds: [OTHER_PHOTO_ID, PHOTO_ID, ADDED_ELSEWHERE_ID] }
    deps.repository.findOwned.mockResolvedValueOnce(WITH_PHOTO).mockResolvedValueOnce(withAdded)
    deps.repository.setPhotoIds
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...NOEL, photoIds: [OTHER_PHOTO_ID, ADDED_ELSEWHERE_ID] })

    await createCollectionsService(deps).removePhoto(MEMBERSHIP)

    expect(deps.repository.setPhotoIds).toHaveBeenLastCalledWith(
      NOEL.id,
      OWNER_ID,
      withAdded.photoIds,
      [OTHER_PHOTO_ID, ADDED_ELSEWHERE_ID],
    )
    expect(deps.logger.info).toHaveBeenCalledTimes(1)
  })

  it('gives up after one retry when the list keeps changing, without a log', async () => {
    const deps = makeDeps()
    deps.repository.findOwned.mockResolvedValue(WITH_PHOTO)
    deps.repository.setPhotoIds.mockResolvedValue(null)

    const removal = createCollectionsService(deps).removePhoto(MEMBERSHIP)

    await expect(removal).rejects.toThrow('Collection kept changing')
    expect(deps.repository.setPhotoIds).toHaveBeenCalledTimes(2)
    expect(deps.logger.info).not.toHaveBeenCalled()
  })
})

describe('a photo deleted from the library', () => {
  it('is left out of the collection the server answers', async () => {
    const deps = makeDeps()
    deps.repository.addPhoto.mockResolvedValue({ ...NOEL, photoIds: [DELETED_PHOTO_ID, PHOTO_ID] })
    deps.repository.findLivePhotoIds.mockResolvedValue([PHOTO_ID])

    const collection = await createCollectionsService(deps).addPhoto(MEMBERSHIP)

    expect(collection.photoIds).toEqual([PHOTO_ID])
  })
})
