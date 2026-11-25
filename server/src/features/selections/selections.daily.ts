import { createHash } from 'node:crypto'
import type { SelectionPhoto } from './selections.repository.js'

// A few minutes of frame at any speed, few enough to feel like a choice.
export const DAILY_SELECTION_SIZE = 20

// A family frame lives in one home: the day changes at midnight in France, not in UTC.
const FAMILY_TIME_ZONE = 'Europe/Paris'

const DAY_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: FAMILY_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

type DayPart = 'year' | 'month' | 'day'

function partOf(parts: Intl.DateTimeFormatPart[], type: DayPart): string {
  const value = parts.find((part) => part.type === type)?.value
  if (value === undefined) {
    throw new Error(`Intl.DateTimeFormat gave no ${type}`)
  }
  return value
}

// YYYY-MM-DD, built from the parts rather than a locale's whole format, which ICU data may change:
// two days compare in calendar order as plain strings.
export function dayOf(date: Date): string {
  const parts = DAY_FORMAT.formatToParts(date)
  return `${partOf(parts, 'year')}-${partOf(parts, 'month')}-${partOf(parts, 'day')}`
}

// A hash, not Math.random: the same seed and photo always get the same rank, so every device and
// every reload shows the same draw all day, and another seed shuffles them anew.
function drawRank(seed: string, photoId: string): string {
  return createHash('sha256').update(`${seed}:${photoId}`).digest('hex')
}

// Also the radio's random tail: reloading a radio gives the same suite within the day.
export function idsInDrawOrder(photos: SelectionPhoto[], seed: string): string[] {
  return photos
    .map(({ id }) => ({ id, rank: drawRank(seed, id) }))
    .sort((a, b) => a.rank.localeCompare(b.rank))
    .map(({ id }) => id)
}

// A received photo joins the library when it is opened, not when it arrives.
function libraryDayOf({ createdAt, openedAt }: SelectionPhoto): string {
  return dayOf(openedAt ?? createdAt)
}

// Photos from before today come first: one added or opened today only fills a lot with room left.
// The lot still changes during the day when a photo leaves it: deleted, the next one in draw
// order takes its place.
export function drawDailySelection(photos: SelectionPhoto[], ownerId: string, now: Date): string[] {
  const today = dayOf(now)
  const seed = `${ownerId}:${today}`
  const olderPhotos = photos.filter((photo) => libraryDayOf(photo) < today)
  const todaysPhotos = photos.filter((photo) => libraryDayOf(photo) >= today)
  const drawnIds = [...idsInDrawOrder(olderPhotos, seed), ...idsInDrawOrder(todaysPhotos, seed)]
  return drawnIds.slice(0, DAILY_SELECTION_SIZE)
}
