import type { Photo } from '@/photo.ts'

// The day is what matters on a wall: the time of the upload was noise.
const PHOTO_DAY_FORMAT: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}

export function formatPhotoDay(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', PHOTO_DAY_FORMAT)
}

// Alt texts and aria-labels: with no sender name until step 5, the day names the photo.
export function photoLabel({ createdAt }: Photo): string {
  return `Photo du ${formatPhotoDay(createdAt)}`
}
