import { useSearchParams } from 'react-router'
import { useCollections } from '@/collections/CollectionsContext.ts'
import type { Collection } from '@/collections/collection.ts'
import { COLLECTION_PARAM } from '@/viewerHistory.ts'

// all: no collection in the URL. loading: the list has not arrived yet, the photos load anyway.
// missing: deleted, someone else's or mistyped. failed: the list could not be loaded.
export type SelectedCollection =
  | { status: 'all' }
  | { status: 'loading'; collectionId: string }
  | { status: 'found'; collectionId: string; collection: Collection }
  | { status: 'missing' | 'failed'; collectionId: string }

// The URL holds the choice: back, reload and a shared link show the same collection.
export function useSelectedCollection(): SelectedCollection {
  const [searchParams] = useSearchParams()
  const { collections, status } = useCollections()
  const collectionId = searchParams.get(COLLECTION_PARAM)
  if (collectionId === null) return { status: 'all' }
  if (status === 'loading') return { status: 'loading', collectionId }
  if (status === 'failed') return { status: 'failed', collectionId }
  const collection = collections.find(({ id }) => id === collectionId)
  if (collection === undefined) return { status: 'missing', collectionId }
  return { status: 'found', collectionId, collection }
}

export function selectedCollectionId(selected: SelectedCollection): string | null {
  return selected.status === 'all' ? null : selected.collectionId
}
