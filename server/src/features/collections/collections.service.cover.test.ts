import { describe, expect, it, vi } from 'vitest'
import type { Logger } from '../../lib/logger.js'
import type {
  CollectionRecord,
  CollectionsRepository,
  LivePhoto,
} from './collections.repository.js'
import { createCollectionsService, photoSpan } from './collections.service.js'

const OWNER_ID = '6b044f9d56a44767c7079b02'
const thumbnailUrl = (cloudinaryId: string): string => `thumb:${cloudinaryId}`

function photo(id: string, createdAt: string): LivePhoto {
  return { id, cloudinaryId: `familyframe/${id}`, createdAt: new Date(createdAt) }
}

const OLDEST = photo('6b044f9d56a44767c7079a01', '2022-11-01T09:00:00Z')
const NEWEST = photo('6b044f9d56a44767c7079a02', '2026-11-22T18:30:00Z')
const MIDDLE = photo('6b044f9d56a44767c7079a03', '2025-07-14T12:00:00Z')
const DELETED_ID = '6b044f9d56a44767c7079a09'

describe('photoSpan', () => {
  it('takes the newest photo as cover, whatever the order they were added in', () => {
    const span = photoSpan([MIDDLE, NEWEST, OLDEST], thumbnailUrl)

    expect(span).toEqual({
      coverUrl: 'thumb:familyframe/6b044f9d56a44767c7079a02',
      oldestPhotoAt: '2022-11-01T09:00:00.000Z',
      newestPhotoAt: '2026-11-22T18:30:00.000Z',
    })
  })

  it('gives one date twice for a single photo', () => {
    const span = photoSpan([MIDDLE], thumbnailUrl)

    expect(span.oldestPhotoAt).toBe(span.newestPhotoAt)
  })

  it('has no cover and no dates while empty', () => {
    expect(photoSpan([], thumbnailUrl)).toEqual({
      coverUrl: null,
      oldestPhotoAt: null,
      newestPhotoAt: null,
    })
  })
})

describe('listCollections', () => {
  it('builds the cover and the dates from the photos still in the library only', async () => {
    const record: CollectionRecord = {
      id: '6b044f9d56a44767c7079c01',
      ownerId: OWNER_ID,
      name: 'Noël',
      photoIds: [OLDEST.id, DELETED_ID, MIDDLE.id],
      createdAt: new Date('2026-11-25T10:00:00Z'),
    }
    const service = createCollectionsService({
      repository: {
        findAllOf: vi.fn<CollectionsRepository['findAllOf']>().mockResolvedValue([record]),
        // NEWEST is in another collection: it must not become this one's cover.
        findLivePhotos: vi
          .fn<CollectionsRepository['findLivePhotos']>()
          .mockResolvedValue([OLDEST, MIDDLE, NEWEST]),
        create: vi.fn(),
        rename: vi.fn(),
        deleteOwned: vi.fn(),
        findOwned: vi.fn(),
        hasOpenedPhoto: vi.fn(),
        addPhoto: vi.fn(),
        setPhotoIds: vi.fn(),
      },
      logger: { info: vi.fn<Logger['info']>(), warn: vi.fn(), error: vi.fn() },
      thumbnailUrl,
    })

    const [collection] = await service.listCollections(OWNER_ID)

    expect(collection).toEqual({
      id: record.id,
      name: 'Noël',
      photoIds: [OLDEST.id, MIDDLE.id],
      coverUrl: 'thumb:familyframe/6b044f9d56a44767c7079a03',
      oldestPhotoAt: '2022-11-01T09:00:00.000Z',
      newestPhotoAt: '2025-07-14T12:00:00.000Z',
    })
  })
})
