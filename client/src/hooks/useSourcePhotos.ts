import { useMemo } from 'react'
import type { CollectionsStatus } from '@/collections/CollectionsContext.ts'
import { useCollections } from '@/collections/CollectionsContext.ts'
import type { Collection } from '@/collections/collection.ts'
import { useDailySelection } from '@/hooks/useDailySelection.ts'
import type { PhotoFeed } from '@/hooks/usePhotoFeed.ts'
import type { Photo } from '@/photo.ts'
import { LIBRARY_SOURCE, type PhotoSource, sourceCollection } from '@/photoSource.ts'
import type { SelectedIds } from '@/selections/selection.ts'

// source: the one actually played, the library when the chosen one is unavailable.
export type SourcePhotos = PhotoFeed & { source: PhotoSource }

type CollectionsState = { collections: Collection[]; status: CollectionsStatus }

// Still newest first: the feed's order, whatever order the ids come in.
function photosIn(photos: Photo[], photoIds: string[] | null): Photo[] {
  if (photoIds === null) return photos
  const kept = new Set(photoIds)
  return photos.filter(({ id }) => kept.has(id))
}

// null: the library was chosen, every photo plays.
function selectedIds(
  source: PhotoSource,
  daily: SelectedIds,
  { collections, status }: CollectionsState,
): SelectedIds | null {
  if (source.kind === 'library') return null
  if (source.kind === 'daily') return daily
  // Until the list arrives, a deleted collection looks like one still loading.
  if (status === 'loading') return { status: 'loading' }
  const collection = sourceCollection(source, collections)
  // Deleted, or the list failed to load: the frame plays the library rather than nothing.
  return collection ? { status: 'ready', photoIds: collection.photoIds } : { status: 'unavailable' }
}

// The source's photos come from the feed, not a request of their own: the frame keeps one live
// list, and an unopened photo, absent from the feed, never plays.
export function useSourcePhotos(feed: PhotoFeed, source: PhotoSource): SourcePhotos {
  const daily = useDailySelection(source.kind === 'daily')
  const ids = selectedIds(source, daily, useCollections())
  const photoIds = ids?.status === 'ready' ? ids.photoIds : null
  const photos = useMemo(() => photosIn(feed.photos, photoIds), [feed.photos, photoIds])

  if (ids?.status === 'loading') return { photos: [], status: 'loading', source }
  if (photoIds === null) return { ...feed, source: LIBRARY_SOURCE }
  return { photos, status: feed.status, source }
}
