import { firstName, joinNames } from '@/components/sharing/shareTexts.ts'
import type { Photo } from '@/photo.ts'

export function waitingPhotosLabel(count: number): string {
  return count === 1 ? 'Vous avez 1 nouvelle photo' : `Vous avez ${count} nouvelles photos`
}

// Each friend once, in the order their first photo arrived: « De Mamie et Tata ».
export function sendersLabel(photos: Photo[]): string {
  const names = photos.flatMap(({ senderName }) =>
    senderName === null ? [] : [firstName(senderName)],
  )
  return `De ${joinNames([...new Set(names)])}`
}

export function revealButtonLabel(isLastPhoto: boolean): string {
  return isLastPhoto ? 'Terminer' : 'Photo suivante'
}
