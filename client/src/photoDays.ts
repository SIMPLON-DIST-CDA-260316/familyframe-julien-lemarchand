import type { Photo } from '@/photo.ts'

// key: the local calendar day, unique in a list; label: what the header says.
export type PhotoDay = { key: string; label: string; photos: Photo[] }

const DAY_FORMAT = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

const DAY_WITH_YEAR_FORMAT = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

// The device's own calendar day: a photo added at 23:30 belongs to that evening, not to the
// next day in UTC.
function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

// « Aujourd'hui », « Hier », then « dim. 22 nov. »; the year only when it is not this one.
function dayLabel(date: Date, now: Date): string {
  if (dayKey(date) === dayKey(now)) return "Aujourd'hui"
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  if (dayKey(date) === dayKey(yesterday)) return 'Hier'
  const format = date.getFullYear() === now.getFullYear() ? DAY_FORMAT : DAY_WITH_YEAR_FORMAT
  return format.format(date)
}

// One group per day, in the photos' own order (newest first). Keyed by day rather than by
// neighbours: a day continued on the next « Charger plus » page still has one header.
export function groupByDay(photos: Photo[], now: Date): PhotoDay[] {
  const days = new Map<string, PhotoDay>()
  for (const photo of photos) {
    const date = new Date(photo.createdAt)
    const key = dayKey(date)
    const day = days.get(key) ?? { key, label: dayLabel(date, now), photos: [] }
    day.photos.push(photo)
    days.set(key, day)
  }
  return [...days.values()]
}

// Puts an empty « Aujourd'hui » first when today has no photo yet: the uploads on their way
// need a day to sit in.
export function withToday(days: PhotoDay[], now: Date): PhotoDay[] {
  const key = dayKey(now)
  if (days[0]?.key === key) return days
  return [{ key, label: dayLabel(now, now), photos: [] }, ...days]
}
