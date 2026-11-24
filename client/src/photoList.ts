import type { Photo } from '@/photo.ts'

// A fetch, an upload response and the socket event can bring the same photo.
export function withNewPhoto(photos: Photo[], photo: Photo): Photo[] {
  return photos.some(({ id }) => id === photo.id) ? photos : [photo, ...photos]
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
