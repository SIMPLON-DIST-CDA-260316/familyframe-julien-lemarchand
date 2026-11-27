import { idsInDrawOrder } from './selections.daily.js'
import type { SelectionPhoto } from './selections.repository.js'

// The photo it starts from and 29 more: a few minutes of frame before it loops.
export const RADIO_LENGTH = 30

const MS_PER_DAY = 24 * 60 * 60 * 1000
// The same week: a holiday, a birthday, a family visit.
const CLOSE_DATES_MS = 7 * MS_PER_DAY

export type RadioDraw = {
  photos: SelectionPhoto[]
  start: SelectionPhoto
  // One list of photo ids per collection of the owner.
  collections: string[][]
  // The Paris day (dayOf): it seeds the draw of the unlinked photos.
  day: string
}

type RadioContext = { start: SelectionPhoto; startCollections: string[][] }

type ScoredPhoto = { photo: SelectionPhoto; linkCount: number; gapMs: number }

function timeGapMs(photo: SelectionPhoto, start: SelectionPhoto): number {
  return Math.abs(photo.createdAt.getTime() - start.createdAt.getTime())
}

// One point per link: the same friend sent both, they arrived within a week of each other, and
// each collection holding both. Two photos the owner added share no sender: that is most of a
// library, it would link everything.
function countLinks(photo: SelectionPhoto, { start, startCollections }: RadioContext): number {
  const isSameSender = start.senderId !== null && photo.senderId === start.senderId
  const isCloseInTime = timeGapMs(photo, start) <= CLOSE_DATES_MS
  const sharedCollectionCount = startCollections.filter((photoIds) =>
    photoIds.includes(photo.id),
  ).length
  return Number(isSameSender) + Number(isCloseInTime) + sharedCollectionCount
}

// Most links first; between equals, the closest in time.
function byLinks(a: ScoredPhoto, b: ScoredPhoto): number {
  return b.linkCount - a.linkCount || a.gapMs - b.gapMs
}

// The start photo, then the photos linked to it, then, when they run out, the others at random:
// drawn like the day's selection, seeded by the start photo and the day, so a reload of the same
// radio plays the same suite that day.
export function buildRadio({ photos, start, collections, day }: RadioDraw): string[] {
  const startCollections = collections.filter((photoIds) => photoIds.includes(start.id))
  const context = { start, startCollections }
  const scored = photos
    .filter(({ id }) => id !== start.id)
    .map((photo) => ({
      photo,
      linkCount: countLinks(photo, context),
      gapMs: timeGapMs(photo, start),
    }))
  const linkedIds = scored
    .filter(({ linkCount }) => linkCount > 0)
    .sort(byLinks)
    .map(({ photo }) => photo.id)
  const unlinkedPhotos = scored.filter(({ linkCount }) => linkCount === 0).map(({ photo }) => photo)
  const unlinkedIds = idsInDrawOrder(unlinkedPhotos, `${start.id}:${day}`)
  return [start.id, ...linkedIds, ...unlinkedIds].slice(0, RADIO_LENGTH)
}
