import { describe, expect, it, vi } from 'vitest'
import { DAILY_SELECTION_SIZE, dayOf } from './selections.daily.js'
import type { SelectionPhoto, SelectionsRepository } from './selections.repository.js'
import { createSelectionsService } from './selections.service.js'

const OWNER_ID = '6b044f9d56a44767c7079b02'
const OTHER_OWNER_ID = '6b044f9d56a44767c7079b03'
// 11:00 in Paris, 25 November 2026.
const MORNING = new Date('2026-11-25T10:00:00Z')
const EVENING = new Date('2026-11-25T21:00:00Z')
const NEXT_DAY = new Date('2026-11-26T10:00:00Z')
const YESTERDAY = new Date('2026-11-24T10:00:00Z')

function photosOn(createdAt: Date, count: number, firstNumber = 1): SelectionPhoto[] {
  return Array.from({ length: count }, (_, index) => ({
    id: (firstNumber + index).toString(16).padStart(24, '0'),
    createdAt,
    senderId: null,
  }))
}

const LIBRARY = photosOn(YESTERDAY, 30)
// Ranked 6th of the library on MORNING's day if it counted as an older photo: a test that keeps it
// out of the lot fails when the rule on photos of the day breaks.
const RANKED_IN_LOT_NUMBER = 103

function makeDeps(photos: SelectionPhoto[] = LIBRARY, now: Date = MORNING) {
  return {
    repository: {
      findOpenedPhotos: vi.fn<SelectionsRepository['findOpenedPhotos']>().mockResolvedValue(photos),
      findCollectionPhotoIds: vi.fn<SelectionsRepository['findCollectionPhotoIds']>(),
    },
    now: () => now,
    random: Math.random,
  }
}

function drawOn(now: Date, photos: SelectionPhoto[] = LIBRARY, ownerId = OWNER_ID) {
  return createSelectionsService(makeDeps(photos, now)).dailySelection(ownerId)
}

describe('dayOf', () => {
  it('changes day at midnight in Paris, not in UTC', () => {
    expect(dayOf(new Date('2026-11-25T22:59:00Z'))).toBe('2026-11-25')
    expect(dayOf(new Date('2026-11-25T23:00:00Z'))).toBe('2026-11-26')
  })

  it('follows summer time', () => {
    expect(dayOf(new Date('2026-07-01T22:00:00Z'))).toBe('2026-07-02')
  })
})

describe('dailySelection', () => {
  it('draws DAILY_SELECTION_SIZE different photos of the library', async () => {
    const { photoIds } = await drawOn(MORNING)

    expect(photoIds).toHaveLength(DAILY_SELECTION_SIZE)
    expect(new Set(photoIds).size).toBe(DAILY_SELECTION_SIZE)
    expect(LIBRARY.map(({ id }) => id)).toEqual(expect.arrayContaining(photoIds))
  })

  it('reads the opened photos of the logged-in account', async () => {
    const deps = makeDeps()

    await createSelectionsService(deps).dailySelection(OWNER_ID)

    expect(deps.repository.findOpenedPhotos).toHaveBeenCalledWith(OWNER_ID)
  })

  it('draws the same lot all day', async () => {
    expect(await drawOn(EVENING)).toEqual(await drawOn(MORNING))
  })

  it('draws another lot the next day', async () => {
    expect(await drawOn(NEXT_DAY)).not.toEqual(await drawOn(MORNING))
  })

  it('draws another lot for another account', async () => {
    const otherLot = await drawOn(MORNING, LIBRARY, OTHER_OWNER_ID)

    expect(otherLot).not.toEqual(await drawOn(MORNING))
  })

  it('keeps the lot when a photo arrives during the day', async () => {
    const todaysPhoto = photosOn(MORNING, 1, RANKED_IN_LOT_NUMBER)

    expect(await drawOn(EVENING, [...LIBRARY, ...todaysPhoto])).toEqual(await drawOn(MORNING))
  })

  it('counts a photo of 00:30 in Paris as one of the day', async () => {
    const justAfterMidnight = photosOn(new Date('2026-11-24T23:30:00Z'), 1, RANKED_IN_LOT_NUMBER)
    const { photoIds } = await drawOn(MORNING, [...LIBRARY, ...justAfterMidnight])

    expect(photoIds).not.toContain(justAfterMidnight[0].id)
  })

  it('fills a lot with room left with the photos of the day, after the older ones', async () => {
    const olderPhotos = photosOn(YESTERDAY, 3)
    // Numbered after the whole library: apart from the older photos' ids.
    const todaysPhotos = photosOn(MORNING, 2, LIBRARY.length + 1)
    const { photoIds } = await drawOn(MORNING, [...todaysPhotos, ...olderPhotos])

    expect(photoIds.slice(0, 3).sort()).toEqual(olderPhotos.map(({ id }) => id))
    expect(photoIds.slice(3).sort()).toEqual(todaysPhotos.map(({ id }) => id))
  })

  it('answers an empty lot for an empty library', async () => {
    expect(await drawOn(MORNING, [])).toEqual({ photoIds: [] })
  })
})
