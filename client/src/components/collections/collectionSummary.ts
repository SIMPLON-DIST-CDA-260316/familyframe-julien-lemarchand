import type { Collection } from '@/collections/collection.ts'
import { photoCountLabel } from '@/components/library/libraryTexts.ts'

const SUMMARY_DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' })

// « 12 photos · 1 nov. 2022 – 22 nov. 2026 », from its oldest photo to its newest; one date when
// they share a day, none while it is empty.
export function collectionSummary({ photoIds, oldestPhotoAt, newestPhotoAt }: Collection): string {
  const count = photoCountLabel(photoIds.length)
  if (oldestPhotoAt === null || newestPhotoAt === null) return count
  const oldest = SUMMARY_DATE_FORMAT.format(new Date(oldestPhotoAt))
  const newest = SUMMARY_DATE_FORMAT.format(new Date(newestPhotoAt))
  return oldest === newest ? `${count} · ${newest}` : `${count} · ${oldest} – ${newest}`
}
