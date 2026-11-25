import { createHash } from 'node:crypto'
import type { SelectionPhoto } from './selections.repository.js'

// A few minutes of frame at any speed, few enough to feel like a choice.
export const DAILY_SELECTION_SIZE = 20

// A family frame lives in one home: the day changes at midnight in France, not in UTC.
const FAMILY_TIME_ZONE = 'Europe/Paris'

// en-CA writes YYYY-MM-DD: two days compare in calendar order as plain strings.
const DAY_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: FAMILY_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function dayOf(date: Date): string {
  return DAY_FORMAT.format(date)
}

// A hash, not Math.random: the same seed and photo always get the same rank, so every device and
// every reload shows the same lot all day, and another seed shuffles them anew.
function drawRank(seed: string, photoId: string): string {
  return createHash('sha256').update(`${seed}:${photoId}`).digest('hex')
}

function idsInDrawOrder(photos: SelectionPhoto[], seed: string): string[] {
  return photos
    .map(({ id }) => ({ id, rank: drawRank(seed, id) }))
    .sort((a, b) => (a.rank < b.rank ? -1 : 1))
    .map(({ id }) => id)
}

// Photos from before today come first: one added today only fills a lot with room left. The lot
// still changes during the day when a photo leaves it (deleted, the next one in draw order takes
// its place), or when a photo received before today is opened: its date is its reception.
export function drawDailySelection(photos: SelectionPhoto[], ownerId: string, now: Date): string[] {
  const today = dayOf(now)
  const seed = `${ownerId}:${today}`
  const olderPhotos = photos.filter(({ createdAt }) => dayOf(createdAt) < today)
  const todaysPhotos = photos.filter(({ createdAt }) => dayOf(createdAt) >= today)
  const drawnIds = [...idsInDrawOrder(olderPhotos, seed), ...idsInDrawOrder(todaysPhotos, seed)]
  return drawnIds.slice(0, DAILY_SELECTION_SIZE)
}
