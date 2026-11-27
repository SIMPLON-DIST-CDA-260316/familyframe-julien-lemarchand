import { useState } from 'react'
import type { Photo } from '@/photo.ts'

export type MailReveal = {
  // The photos waiting when the reveal started, oldest first: they are discovered in the order
  // they were sent. null while closed.
  photos: Photo[] | null
  start: (waitingPhotos: Photo[]) => void
  close: () => void
}

// A copy, not the live list: a photo opened, or one arriving meanwhile, must not shift the reveal.
export function useMailReveal(): MailReveal {
  const [photos, setPhotos] = useState<Photo[] | null>(null)
  return {
    photos,
    start: (waitingPhotos) => setPhotos([...waitingPhotos].reverse()),
    close: () => setPhotos(null),
  }
}
