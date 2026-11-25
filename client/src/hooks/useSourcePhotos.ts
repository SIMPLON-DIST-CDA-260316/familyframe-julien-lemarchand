import { useMemo } from 'react'
import { useCollections } from '@/collections/CollectionsContext.ts'
import type { Collection } from '@/collections/collection.ts'
import type { PhotoFeed } from '@/hooks/usePhotoFeed.ts'
import type { Photo } from '@/photo.ts'
import { LIBRARY_SOURCE, type PhotoSource, sourceCollection } from '@/photoSource.ts'

// source: the one actually played, the library when the chosen collection is gone.
export type SourcePhotos = PhotoFeed & { source: PhotoSource }

// Still newest first: the feed's order, whatever order the photos were added in.
function photosIn(photos: Photo[], collection: Collection | undefined): Photo[] {
  if (collection === undefined) return photos
  const photoIds = new Set(collection.photoIds)
  return photos.filter(({ id }) => photoIds.has(id))
}

// The collection's photos come from the feed, not a request of their own: the frame keeps one
// live list, and an unopened photo, absent from the feed, never plays.
export function useSourcePhotos(feed: PhotoFeed, source: PhotoSource): SourcePhotos {
  const { collections, status } = useCollections()
  const collection = sourceCollection(source, collections)
  const photos = useMemo(() => photosIn(feed.photos, collection), [feed.photos, collection])

  // Until the list arrives, a deleted collection looks like one still loading.
  if (source.kind === 'collection' && status === 'loading') {
    return { photos: [], status: 'loading', source }
  }
  // Deleted, or the list failed to load: the frame plays the library rather than nothing.
  if (collection === undefined) return { ...feed, source: LIBRARY_SOURCE }
  return { photos, status: feed.status, source }
}
