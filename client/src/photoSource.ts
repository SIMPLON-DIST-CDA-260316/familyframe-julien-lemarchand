import type { Collection } from '@/collections/collection.ts'

// What the frame is set to play, stored per device. daily: the day's selection, drawn by the
// server.
export type PhotoSource =
  | { kind: 'library' }
  | { kind: 'daily' }
  | { kind: 'collection'; collectionId: string }

// What the frame plays right now: a radio is never stored, it lives in the address (RADIO_PARAM).
export type PlayedSource = PhotoSource | { kind: 'radio'; photoId: string }

export const LIBRARY_SOURCE: PhotoSource = { kind: 'library' }

export const DAILY_SOURCE: PhotoSource = { kind: 'daily' }

const COLLECTION_KEY_PREFIX = 'collection:'

const RADIO_KEY_PREFIX = 'radio:'

export function isPhotoSource(value: unknown): value is PhotoSource {
  if (typeof value !== 'object' || value === null || !('kind' in value)) return false
  if (value.kind === 'library' || value.kind === 'daily') return true
  return (
    value.kind === 'collection' && 'collectionId' in value && typeof value.collectionId === 'string'
  )
}

// Radio and toggle values are strings: one string per source. Each radio has its own: a radio
// from another photo is another source.
export function sourceKey(source: PlayedSource): string {
  if (source.kind === 'collection') return `${COLLECTION_KEY_PREFIX}${source.collectionId}`
  if (source.kind === 'radio') return `${RADIO_KEY_PREFIX}${source.photoId}`
  return source.kind
}

export function sourceFromKey(key: string): PhotoSource {
  if (key === 'daily') return DAILY_SOURCE
  if (!key.startsWith(COLLECTION_KEY_PREFIX)) return LIBRARY_SOURCE
  return { kind: 'collection', collectionId: key.slice(COLLECTION_KEY_PREFIX.length) }
}

// The key of the source the frame plays: the library when the chosen collection is gone.
export function playedSourceKey(source: PlayedSource, collections: Collection[]): string {
  if (source.kind !== 'collection') return sourceKey(source)
  return sourceKey(sourceCollection(source, collections) ? source : LIBRARY_SOURCE)
}

// undefined plays the library: the source is the library, or its collection was deleted.
export function sourceCollection(
  source: PlayedSource,
  collections: Collection[],
): Collection | undefined {
  if (source.kind !== 'collection') return undefined
  return collections.find(({ id }) => id === source.collectionId)
}
