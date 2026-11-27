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

// French quotation marks with their non-breaking spaces: the message reads as said by the sender.
export function quotedMessage(message: string): string {
  return `«\u00a0${message}\u00a0»`
}

// Alt texts and aria-labels: the day names the photo, the sender tells a received one apart.
export function photoLabel({ createdAt, senderName }: Photo): string {
  const day = formatPhotoDay(createdAt)
  return senderName === null ? `Photo du ${day}` : `Photo envoyée par ${senderName}, du ${day}`
}
