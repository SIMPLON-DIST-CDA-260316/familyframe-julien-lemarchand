import type { Collection } from '@/collections/collection.ts'

// What the frame plays. Step 11 adds its own kinds (the day's selection, the radio).
export type PhotoSource = { kind: 'library' } | { kind: 'collection'; collectionId: string }

export const LIBRARY_SOURCE: PhotoSource = { kind: 'library' }

const COLLECTION_KEY_PREFIX = 'collection:'

export function isPhotoSource(value: unknown): value is PhotoSource {
  if (typeof value !== 'object' || value === null || !('kind' in value)) return false
  if (value.kind === 'library') return true
  return (
    value.kind === 'collection' && 'collectionId' in value && typeof value.collectionId === 'string'
  )
}

// Radio and toggle values are strings: one string per source.
export function sourceKey(source: PhotoSource): string {
  return source.kind === 'library' ? 'library' : `${COLLECTION_KEY_PREFIX}${source.collectionId}`
}

export function sourceFromKey(key: string): PhotoSource {
  if (!key.startsWith(COLLECTION_KEY_PREFIX)) return LIBRARY_SOURCE
  return { kind: 'collection', collectionId: key.slice(COLLECTION_KEY_PREFIX.length) }
}

// The key of the source the frame plays: the library when the chosen collection is gone.
export function playedSourceKey(source: PhotoSource, collections: Collection[]): string {
  return sourceKey(sourceCollection(source, collections) ? source : LIBRARY_SOURCE)
}

// undefined plays the library: the source is the library, or its collection was deleted.
export function sourceCollection(
  source: PhotoSource,
  collections: Collection[],
): Collection | undefined {
  if (source.kind !== 'collection') return undefined
  return collections.find(({ id }) => id === source.collectionId)
}
