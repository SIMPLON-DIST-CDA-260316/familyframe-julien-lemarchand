const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS
// Past a week, « il y a 12 jours » is harder to place than the date itself.
const RELATIVE_DAYS = 7

const DAY_FORMAT = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const FULL_FORMAT = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeStyle: 'short' })

// Local midnight: « hier » is the calendar day before, not 24 hours ago.
function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

// Calendar days, rounded: a day with a clock change lasts 23 or 25 hours.
function daysBetween(date: Date, now: Date): number {
  return Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS)
}

// As a mail box: « à l'instant », « il y a 5 min », « il y a 2 h », « hier », « il y a 3 jours »,
// then the day.
export function relativeSendDate(date: Date, now: Date): string {
  const elapsedMs = now.getTime() - date.getTime()
  const days = daysBetween(date, now)
  if (elapsedMs < MINUTE_MS) return "à l'instant"
  if (elapsedMs < HOUR_MS) return `il y a ${Math.floor(elapsedMs / MINUTE_MS)} min`
  if (days === 0) return `il y a ${Math.floor(elapsedMs / HOUR_MS)} h`
  if (days === 1) return 'hier'
  if (days < RELATIVE_DAYS) return `il y a ${days} jours`
  return DAY_FORMAT.format(date)
}

// The tooltip: the exact moment, when the row only says « hier ».
export function fullSendDate(date: Date): string {
  return FULL_FORMAT.format(date)
}
