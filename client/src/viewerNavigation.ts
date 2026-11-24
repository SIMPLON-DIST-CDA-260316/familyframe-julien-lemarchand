import type { Photo } from '@/photo.ts'

// Close enough to the last loaded photo that the next page should already be on its way.
export const LOAD_AHEAD_COUNT = 3

// Where the viewer last saw its photo in the loaded list.
export type SeenPhoto = { id: string; index: number }

export type ViewerLibraryState = {
  photos: Photo[]
  hasMore: boolean
  isLoadingMore: boolean
  isFirstPageLoaded: boolean
}

export type MissingPhotoStep =
  | { kind: 'wait' }
  | { kind: 'loadMore' }
  | { kind: 'show'; id: string }
  | { kind: 'close' }

// The removed photo's place goes to the next one, or to the previous one when it was the last.
export function photoIdAfterRemoval(photos: Photo[], removedIndex: number): string | null {
  const index = Math.min(removedIndex, photos.length - 1)
  return index < 0 ? null : photos[index].id
}

export function missingPhotoStep(
  openId: string,
  lastSeen: SeenPhoto | null,
  library: ViewerLibraryState,
): MissingPhotoStep {
  // Seen a moment ago, gone now: it was deleted, here or on another device. Unless its place is
  // past the end of a list that has more pages: a reconnect can push it onto a page not loaded yet.
  const isPlaceLoaded = lastSeen !== null && lastSeen.index < library.photos.length
  if (lastSeen?.id === openId && (isPlaceLoaded || !library.hasMore)) {
    const nextId = photoIdAfterRemoval(library.photos, lastSeen.index)
    return nextId === null ? { kind: 'close' } : { kind: 'show', id: nextId }
  }
  if (!library.isFirstPageLoaded || library.isLoadingMore) return { kind: 'wait' }
  // A link to an older photo: it may sit on a page not loaded yet.
  return library.hasMore ? { kind: 'loadMore' } : { kind: 'close' }
}

export function shouldLoadAhead(index: number, library: ViewerLibraryState): boolean {
  const isNearEnd = index >= library.photos.length - LOAD_AHEAD_COUNT
  return isNearEnd && library.hasMore && !library.isLoadingMore
}

// The API sends no total: « + » says more photos are on pages not loaded yet.
export function viewerCounter(index: number, library: ViewerLibraryState): string {
  const total = library.hasMore ? `${library.photos.length}+` : String(library.photos.length)
  return `${index + 1} / ${total}`
}
