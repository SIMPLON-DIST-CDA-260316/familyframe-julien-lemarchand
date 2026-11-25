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
  random: () => number
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

// Fisher-Yates on a copy: every order is equally likely.
function shuffled(items: ScoredPhoto[], random: () => number): ScoredPhoto[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1))
    const swapped = result[index]
    result[index] = result[swapIndex]
    result[swapIndex] = swapped
  }
  return result
}

// The start photo, then the photos linked to it, then, when they run out, the others at random.
export function buildRadio({ photos, start, collections, random }: RadioDraw): string[] {
  const startCollections = collections.filter((photoIds) => photoIds.includes(start.id))
  const context = { start, startCollections }
  const scored = photos
    .filter(({ id }) => id !== start.id)
    .map((photo) => ({
      photo,
      linkCount: countLinks(photo, context),
      gapMs: timeGapMs(photo, start),
    }))
  const linked = scored.filter(({ linkCount }) => linkCount > 0).sort(byLinks)
  const unlinked = shuffled(
    scored.filter(({ linkCount }) => linkCount === 0),
    random,
  )
  const followingIds = [...linked, ...unlinked].map(({ photo }) => photo.id)
  return [start.id, ...followingIds].slice(0, RADIO_LENGTH)
}
