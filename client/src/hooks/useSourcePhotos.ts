import { useMemo } from 'react'
import type { CollectionsStatus } from '@/collections/CollectionsContext.ts'
import { useCollections } from '@/collections/CollectionsContext.ts'
import type { Collection } from '@/collections/collection.ts'
import { useDailySelection } from '@/hooks/useDailySelection.ts'
import type { PhotoFeed } from '@/hooks/usePhotoFeed.ts'
import { useRadioSelection } from '@/hooks/useRadioSelection.ts'
import type { Photo } from '@/photo.ts'
import { LIBRARY_SOURCE, type PlayedSource, sourceCollection } from '@/photoSource.ts'
import type { SelectedIds } from '@/selections/selection.ts'

// source: the one actually played, the library when the chosen one is unavailable.
export type SourcePhotos = PhotoFeed & { source: PlayedSource }

type CollectionsState = { collections: Collection[]; status: CollectionsStatus }

// The selections the frame may play, asked only while it plays them.
type Selections = { daily: SelectedIds; radio: SelectedIds }

// Still newest first: the feed's order, whatever order the ids come in.
function photosInFeedOrder(photos: Photo[], photoIds: string[]): Photo[] {
  const kept = new Set(photoIds)
  return photos.filter(({ id }) => kept.has(id))
}

// A radio keeps the server's order, its first photo first.
function photosInIdOrder(photos: Photo[], photoIds: string[]): Photo[] {
  const byId = new Map(photos.map((photo) => [photo.id, photo]))
  return photoIds.flatMap((id) => byId.get(id) ?? [])
}

// null: the library was chosen, every photo plays.
function selectedIds(
  source: PlayedSource,
  selections: Selections,
  { collections, status }: CollectionsState,
): SelectedIds | null {
  if (source.kind === 'library') return null
  if (source.kind === 'daily' || source.kind === 'radio') return selections[source.kind]
  // Until the list arrives, a deleted collection looks like one still loading.
  if (status === 'loading') return { status: 'loading' }
  const collection = sourceCollection(source, collections)
  // Deleted, or the list failed to load: the frame plays the library rather than nothing.
  return collection ? { status: 'ready', photoIds: collection.photoIds } : { status: 'unavailable' }
}

// The source's photos come from the feed, not a request of their own: the frame keeps one live
// list, and an unopened photo, absent from the feed, never plays.
export function useSourcePhotos(feed: PhotoFeed, source: PlayedSource): SourcePhotos {
  const daily = useDailySelection(source.kind === 'daily')
  const radio = useRadioSelection(source.kind === 'radio' ? source.photoId : null)
  const ids = selectedIds(source, { daily, radio }, useCollections())
  const photoIds = ids?.status === 'ready' ? ids.photoIds : null
  const pick = source.kind === 'radio' ? photosInIdOrder : photosInFeedOrder
  const photos = useMemo(
    () => (photoIds === null ? feed.photos : pick(feed.photos, photoIds)),
    [feed.photos, photoIds, pick],
  )

  if (ids?.status === 'loading') return { photos: [], status: 'loading', source }
  if (photoIds === null) return { ...feed, source: LIBRARY_SOURCE }
  return { photos, status: feed.status, source }
}
