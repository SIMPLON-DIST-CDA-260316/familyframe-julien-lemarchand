import { describe, expect, it, vi } from 'vitest'
import { AppError } from '../../errors/app-error.js'
import { RADIO_LENGTH } from './selections.radio.js'
import type { SelectionPhoto, SelectionsRepository } from './selections.repository.js'
import { createSelectionsService } from './selections.service.js'

const OWNER_ID = '6b044f9d56a44767c7079b02'
const MAMIE_ID = '6b044f9d56a44767c7079b05'

function photo(number: number, createdAt: string, senderId: string | null = null): SelectionPhoto {
  const id = number.toString(16).padStart(24, 'a')
  return { id, createdAt: new Date(createdAt), openedAt: null, senderId }
}

// Sent by Mamie on 1 June: the radio starts from it.
const START = photo(1, '2026-06-01T10:00:00Z', MAMIE_ID)
const SAME_SENDER = photo(2, '2026-01-01T10:00:00Z', MAMIE_ID)
const FOUR_DAYS_LATER = photo(3, '2026-06-05T10:00:00Z')
const EIGHT_DAYS_LATER = photo(4, '2026-06-09T10:00:00Z')
const IN_TWO_COLLECTIONS = photo(5, '2026-01-01T10:00:00Z')
const UNRELATED = photo(6, '2026-01-01T10:00:00Z')
const LIBRARY = [
  START,
  SAME_SENDER,
  FOUR_DAYS_LATER,
  EIGHT_DAYS_LATER,
  IN_TWO_COLLECTIONS,
  UNRELATED,
]
// 11:00 in Paris, 25 November 2026.
const MORNING = new Date('2026-11-25T10:00:00Z')
const EVENING = new Date('2026-11-25T21:00:00Z')
const NEXT_DAY = new Date('2026-11-26T10:00:00Z')
const COLLECTIONS = [
  [START.id, IN_TWO_COLLECTIONS.id],
  [IN_TWO_COLLECTIONS.id, START.id],
  // Without the start photo: it links nothing to it.
  [UNRELATED.id],
]

function makeDeps(
  photos: SelectionPhoto[] = LIBRARY,
  collections: string[][] = COLLECTIONS,
  now: Date = MORNING,
) {
  return {
    repository: {
      findOpenedPhotos: vi.fn<SelectionsRepository['findOpenedPhotos']>().mockResolvedValue(photos),
      findCollectionPhotoIds: vi
        .fn<SelectionsRepository['findCollectionPhotoIds']>()
        .mockResolvedValue(collections),
    },
    now: () => now,
  }
}

async function radioFrom(photoId: string, deps = makeDeps()): Promise<string[]> {
  const { photoIds } = await createSelectionsService(deps).radioSelection({
    ownerId: OWNER_ID,
    photoId,
  })
  return photoIds
}

describe('radioSelection', () => {
  it('starts with the photo it is built on', async () => {
    expect((await radioFrom(START.id))[0]).toBe(START.id)
  })

  it('reads the photos and the collections of the logged-in account', async () => {
    const deps = makeDeps()

    await radioFrom(START.id, deps)

    expect(deps.repository.findOpenedPhotos).toHaveBeenCalledWith(OWNER_ID)
    expect(deps.repository.findCollectionPhotoIds).toHaveBeenCalledWith(OWNER_ID)
  })

  it('plays the most linked photos first, the closest in time between equals', async () => {
    expect(await radioFrom(START.id)).toEqual([
      START.id,
      // Two shared collections.
      IN_TWO_COLLECTIONS.id,
      // One link each: the same week, then the same sender five months earlier.
      FOUR_DAYS_LATER.id,
      SAME_SENDER.id,
      // No link: eight days is no longer close, and the collection without START does not count.
      // Their order is MORNING's draw.
      EIGHT_DAYS_LATER.id,
      UNRELATED.id,
    ])
  })

  it('does not link two photos the owner added as the same sender', async () => {
    const ownStart = photo(10, '2026-06-01T10:00:00Z')
    const ownCloser = photo(12, '2026-02-01T10:00:00Z')
    const ownFarther = photo(11, '2026-01-01T10:00:00Z')
    const deps = makeDeps([ownStart, ownCloser, ownFarther], [])

    // Linked, they would come closest first; unlinked, MORNING's draw puts the farther first.
    expect(await radioFrom(ownStart.id, deps)).toEqual([ownStart.id, ownFarther.id, ownCloser.id])
  })

  it('tops up with the unlinked photos in the same order all day', async () => {
    const eveningRadio = await radioFrom(START.id, makeDeps(LIBRARY, COLLECTIONS, EVENING))

    expect(eveningRadio).toEqual(await radioFrom(START.id))
  })

  it('draws the unlinked photos in another order the next day', async () => {
    const nextDayRadio = await radioFrom(START.id, makeDeps(LIBRARY, COLLECTIONS, NEXT_DAY))

    expect(nextDayRadio.slice(-2)).toEqual([UNRELATED.id, EIGHT_DAYS_LATER.id])
  })

  it('stops at RADIO_LENGTH photos', async () => {
    const moreThanRadioLength = RADIO_LENGTH + 10
    const sameWeek = Array.from({ length: moreThanRadioLength }, (_, index) =>
      photo(LIBRARY.length + 1 + index, '2026-06-02T10:00:00Z'),
    )
    const deps = makeDeps([START, ...sameWeek], [])

    expect(await radioFrom(START.id, deps)).toHaveLength(RADIO_LENGTH)
  })

  it('plays the photo alone in a library of one', async () => {
    expect(await radioFrom(START.id, makeDeps([START], []))).toEqual([START.id])
  })

  it('finds a photo id sent in capitals', async () => {
    expect((await radioFrom(START.id.toUpperCase()))[0]).toBe(START.id)
  })

  it('refuses a photo outside the opened library before reading the collections', async () => {
    const deps = makeDeps()

    await expect(radioFrom('6b044f9d56a44767c7079a99', deps)).rejects.toThrow(
      new AppError('PHOTO_NOT_FOUND'),
    )
    expect(deps.repository.findCollectionPhotoIds).not.toHaveBeenCalled()
  })

  it('refuses an id that is not an ObjectId before any query', async () => {
    const deps = makeDeps()

    await expect(radioFrom('pas-un-id', deps)).rejects.toThrow(new AppError('PHOTO_NOT_FOUND'))
    expect(deps.repository.findOpenedPhotos).not.toHaveBeenCalled()
  })
})
