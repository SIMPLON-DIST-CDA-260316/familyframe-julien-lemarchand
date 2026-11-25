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
// next day in UTC. Zero-padded (2026-01-05), so comparing two keys compares their days.
export function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

// Newest day first, whatever the photos' order: an old photo opened while older pages are not
// loaded yet arrives at the end of the list, and its day must still sit in its place.
function newestDayFirst(days: PhotoDay[]): PhotoDay[] {
  return days.toSorted((a, b) => (a.key < b.key ? 1 : -1))
}

// « Aujourd'hui », « Hier », then « dim. 22 nov. »; the year only when it is not this one.
function dayLabel(date: Date, now: Date): string {
  if (dayKey(date) === dayKey(now)) return "Aujourd'hui"
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  if (dayKey(date) === dayKey(yesterday)) return 'Hier'
  const format = date.getFullYear() === now.getFullYear() ? DAY_FORMAT : DAY_WITH_YEAR_FORMAT
  return format.format(date)
}

// One group per day, newest day first. Keyed by day rather than by neighbours: a day continued
// on the next « Charger plus » page still has one header.
export function groupByDay(photos: Photo[], now: Date): PhotoDay[] {
  const days = new Map<string, PhotoDay>()
  for (const photo of photos) {
    const date = new Date(photo.createdAt)
    const key = dayKey(date)
    const day = days.get(key) ?? { key, label: dayLabel(date, now), photos: [] }
    day.photos.push(photo)
    days.set(key, day)
  }
  return newestDayFirst([...days.values()])
}

// Adds an empty « Aujourd'hui » when today has no photo yet: the uploads on their way need a
// day to sit in. Searched, not just the first day: with the device's clock behind the server,
// a photo can be dated tomorrow and come first.
export function withToday(days: PhotoDay[], now: Date): PhotoDay[] {
  const key = dayKey(now)
  if (days.some((day) => day.key === key)) return days
  return newestDayFirst([...days, { key, label: dayLabel(now, now), photos: [] }])
}
