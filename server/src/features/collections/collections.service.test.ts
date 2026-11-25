import { describe, expect, it, vi } from 'vitest'
import { AppError } from '../../errors/app-error.js'
import type { Logger } from '../../lib/logger.js'
import type { ApiErrorCode } from '../../types.js'
import type {
  CollectionRecord,
  CollectionsRepository,
  WriteRefusal,
} from './collections.repository.js'
import { createCollectionsService, parseCollectionName } from './collections.service.js'

const OWNER_ID = '6b044f9d56a44767c7079b02'
const PHOTO_ID = '6b044f9d56a44767c7079a01'
const DELETED_PHOTO_ID = '6b044f9d56a44767c7079a09'
const NOEL: CollectionRecord = {
  id: '6b044f9d56a44767c7079c01',
  ownerId: OWNER_ID,
  name: 'Noël',
  photoIds: [PHOTO_ID, DELETED_PHOTO_ID],
  createdAt: new Date('2026-11-25T10:00:00Z'),
}
const ETE: CollectionRecord = { ...NOEL, id: '6b044f9d56a44767c7079c02', name: 'Été', photoIds: [] }
const REFUSALS: [WriteRefusal, ApiErrorCode][] = [
  ['not_found', 'COLLECTION_NOT_FOUND'],
  ['name_taken', 'COLLECTION_EXISTS'],
]

// Every dependency succeeds by default; each test breaks only the one it is about.
function makeDeps() {
  return {
    repository: {
      findAllOf: vi.fn<CollectionsRepository['findAllOf']>().mockResolvedValue([NOEL, ETE]),
      // The deleted photo is no longer in the library.
      findLivePhotoIds: vi
        .fn<CollectionsRepository['findLivePhotoIds']>()
        .mockResolvedValue([PHOTO_ID]),
      create: vi.fn<CollectionsRepository['create']>().mockResolvedValue(ETE),
      rename: vi.fn<CollectionsRepository['rename']>().mockResolvedValue(NOEL),
      deleteOwned: vi.fn<CollectionsRepository['deleteOwned']>().mockResolvedValue(NOEL),
      findOwned: vi.fn<CollectionsRepository['findOwned']>(),
      hasOpenedPhoto: vi.fn<CollectionsRepository['hasOpenedPhoto']>(),
      addPhoto: vi.fn<CollectionsRepository['addPhoto']>(),
      setPhotoIds: vi.fn<CollectionsRepository['setPhotoIds']>(),
    },
    logger: {
      info: vi.fn<Logger['info']>(),
      warn: vi.fn<Logger['warn']>(),
      error: vi.fn<Logger['error']>(),
    },
  }
}

describe('parseCollectionName', () => {
  it('trims the name', () => {
    expect(parseCollectionName('  Vacances  ')).toBe('Vacances')
  })

  it('accepts 50 characters', () => {
    expect(parseCollectionName('a'.repeat(50))).toBe('a'.repeat(50))
  })

  it.each([
    ['blank', '   '],
    ['longer than 50 characters', 'a'.repeat(51)],
    ['not text', 42],
    ['missing', undefined],
  ])('refuses a name %s', (_case, name) => {
    expect(() => parseCollectionName(name)).toThrow(new AppError('COLLECTION_NAME_INVALID'))
  })
})

describe('listCollections', () => {
  it('sorts by name in French order', async () => {
    const collections = await createCollectionsService(makeDeps()).listCollections(OWNER_ID)

    expect(collections.map((collection) => collection.name)).toEqual(['Été', 'Noël'])
  })

  it('leaves out the photos deleted from the library, with one query for all', async () => {
    const deps = makeDeps()

    const collections = await createCollectionsService(deps).listCollections(OWNER_ID)

    expect(collections[1]).toEqual({ id: NOEL.id, name: 'Noël', photoIds: [PHOTO_ID] })
    expect(deps.repository.findLivePhotoIds).toHaveBeenCalledOnce()
    expect(deps.repository.findLivePhotoIds).toHaveBeenCalledWith(OWNER_ID, NOEL.photoIds)
  })
})

describe('createCollection', () => {
  it('creates the collection under the trimmed name', async () => {
    const deps = makeDeps()

    const collection = await createCollectionsService(deps).createCollection({
      ownerId: OWNER_ID,
      name: ' Été ',
    })

    expect(deps.repository.create).toHaveBeenCalledWith(OWNER_ID, 'Été')
    expect(collection).toEqual({ id: ETE.id, name: 'Été', photoIds: [] })
  })

  it('refuses a name the account already uses', async () => {
    const deps = makeDeps()
    deps.repository.create.mockResolvedValue('name_taken')

    const creation = createCollectionsService(deps).createCollection({
      ownerId: OWNER_ID,
      name: 'Été',
    })

    await expect(creation).rejects.toThrow(new AppError('COLLECTION_EXISTS'))
  })

  it('logs the creation by identifiers only, never the name', async () => {
    const deps = makeDeps()

    await createCollectionsService(deps).createCollection({ ownerId: OWNER_ID, name: 'Été' })

    expect(deps.logger.info).toHaveBeenCalledWith('collection.created', {
      collectionId: ETE.id,
      userId: OWNER_ID,
    })
  })
})

describe('renameCollection', () => {
  it('renames the collection and keeps its photos still in the library', async () => {
    const deps = makeDeps()

    const collection = await createCollectionsService(deps).renameCollection({
      id: NOEL.id,
      ownerId: OWNER_ID,
      name: 'Noël',
    })

    expect(deps.repository.rename).toHaveBeenCalledWith(NOEL.id, OWNER_ID, 'Noël')
    expect(collection.photoIds).toEqual([PHOTO_ID])
    expect(deps.logger.info).toHaveBeenCalledWith('collection.renamed', {
      collectionId: NOEL.id,
      userId: OWNER_ID,
    })
  })

  it('answers a malformed id as not found, without a query', async () => {
    const deps = makeDeps()

    const rename = createCollectionsService(deps).renameCollection({
      id: 'abc',
      ownerId: OWNER_ID,
      name: 'Noël',
    })

    await expect(rename).rejects.toThrow(new AppError('COLLECTION_NOT_FOUND'))
    expect(deps.repository.rename).not.toHaveBeenCalled()
  })

  it.each(REFUSALS)('answers a %s refusal with %s', async (refusal, code) => {
    const deps = makeDeps()
    deps.repository.rename.mockResolvedValue(refusal)

    const rename = createCollectionsService(deps).renameCollection({
      id: NOEL.id,
      ownerId: OWNER_ID,
      name: 'Été',
    })

    await expect(rename).rejects.toThrow(new AppError(code))
  })
})

describe('deleteCollection', () => {
  it('deletes the collection and logs it by identifiers', async () => {
    const deps = makeDeps()

    await createCollectionsService(deps).deleteCollection({ id: NOEL.id, ownerId: OWNER_ID })

    expect(deps.repository.deleteOwned).toHaveBeenCalledWith(NOEL.id, OWNER_ID)
    expect(deps.logger.info).toHaveBeenCalledWith('collection.deleted', {
      collectionId: NOEL.id,
      userId: OWNER_ID,
    })
  })

  it("answers an unknown or someone else's collection as not found", async () => {
    const deps = makeDeps()
    deps.repository.deleteOwned.mockResolvedValue(null)

    const deletion = createCollectionsService(deps).deleteCollection({
      id: NOEL.id,
      ownerId: OWNER_ID,
    })

    await expect(deletion).rejects.toThrow(new AppError('COLLECTION_NOT_FOUND'))
  })
})
