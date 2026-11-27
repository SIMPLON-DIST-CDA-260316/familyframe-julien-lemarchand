import type { Photo } from '@/photo.ts'

// A fetch, an upload response and the socket event can bring the same photo. Placed by id,
// newest first like the API: an opened photo goes back to the day it was received. Ids are
// ObjectIds of the same length, so comparing the strings compares their creation times.
export function withNewPhoto(photos: Photo[], photo: Photo): Photo[] {
  if (photos.some(({ id }) => id === photo.id)) return photos
  const olderIndex = photos.findIndex(({ id }) => id < photo.id)
  if (olderIndex === -1) return [...photos, photo]
  return [...photos.slice(0, olderIndex), photo, ...photos.slice(olderIndex)]
}

export function withoutPhoto(photos: Photo[], deletedId: string): Photo[] {
  return photos.filter(({ id }) => id !== deletedId)
}

// Keyset pages never overlap, but a photo added live may already be in the next page.
export function withOlderPhotos(photos: Photo[], olderPhotos: Photo[]): Photo[] {
  const newOnes = olderPhotos.filter((older) => !photos.some(({ id }) => id === older.id))
  return [...photos, ...newOnes]
}

// A load takes several requests: its pages predate the events received meanwhile.
export function withLiveChanges(
  photos: Photo[],
  addedPhotos: Photo[],
  deletedIds: string[],
): Photo[] {
  const withAddedPhotos = addedPhotos.reduce(withNewPhoto, photos)
  return deletedIds.reduce(withoutPhoto, withAddedPhotos)
}
