import type { Collection } from '@/collections/collection.ts'

// What the frame plays. daily: the day's selection, drawn by the server.
export type PhotoSource =
  | { kind: 'library' }
  | { kind: 'daily' }
  | { kind: 'collection'; collectionId: string }

export const LIBRARY_SOURCE: PhotoSource = { kind: 'library' }

export const DAILY_SOURCE: PhotoSource = { kind: 'daily' }

const COLLECTION_KEY_PREFIX = 'collection:'

export function isPhotoSource(value: unknown): value is PhotoSource {
  if (typeof value !== 'object' || value === null || !('kind' in value)) return false
  if (value.kind === 'library' || value.kind === 'daily') return true
  return (
    value.kind === 'collection' && 'collectionId' in value && typeof value.collectionId === 'string'
  )
}

// Radio and toggle values are strings: one string per source.
export function sourceKey(source: PhotoSource): string {
  return source.kind === 'collection'
    ? `${COLLECTION_KEY_PREFIX}${source.collectionId}`
    : source.kind
}

export function sourceFromKey(key: string): PhotoSource {
  if (key === 'daily') return DAILY_SOURCE
  if (!key.startsWith(COLLECTION_KEY_PREFIX)) return LIBRARY_SOURCE
  return { kind: 'collection', collectionId: key.slice(COLLECTION_KEY_PREFIX.length) }
}

// The key of the source the frame plays: the library when the chosen collection is gone.
export function playedSourceKey(source: PhotoSource, collections: Collection[]): string {
  if (source.kind !== 'collection') return sourceKey(source)
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
