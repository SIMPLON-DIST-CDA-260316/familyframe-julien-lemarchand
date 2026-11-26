import { createContext, useContext } from 'react'
import type { Collection } from '@/collections/collection.ts'
import type { CollectionDeletion, CollectionResult } from '@/collections/collectionsApi.ts'

// failed: no list loaded yet. A reload that fails keeps the list shown, still 'loaded'.
export type CollectionsStatus = 'loading' | 'loaded' | 'failed'

export type CollectionsContextValue = {
  // Sorted by name, like the server answers them.
  collections: Collection[]
  status: CollectionsStatus
  create: (name: string) => Promise<CollectionResult>
  rename: (id: string, name: string) => Promise<CollectionResult>
  remove: (id: string) => Promise<CollectionDeletion>
  addPhoto: (id: string, photoId: string) => Promise<CollectionResult>
  addPhotos: (id: string, photoIds: string[]) => Promise<CollectionResult>
  removePhoto: (id: string, photoId: string) => Promise<CollectionResult>
}

export const CollectionsContext = createContext<CollectionsContextValue | null>(null)

export function useCollections(): CollectionsContextValue {
  const value = useContext(CollectionsContext)
  if (value === null) throw new Error('useCollections must be used inside CollectionsProvider')
  return value
}
