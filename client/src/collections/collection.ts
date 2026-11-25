// Copy of server/src/types.ts, see why there. Keep both in sync.

// photoIds: the owner's photos, in the order they were added; a deleted photo is not listed.
export type Collection = {
  id: string
  name: string
  photoIds: string[]
}

// Same bound as the server: the field stops there instead of answering an error.
export const MAX_COLLECTION_NAME_LENGTH = 50

export function isCollection(value: unknown): value is Collection {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'name' in value &&
    typeof value.name === 'string' &&
    'photoIds' in value &&
    Array.isArray(value.photoIds) &&
    value.photoIds.every((photoId) => typeof photoId === 'string')
  )
}

export function isCollectionList(value: unknown): value is { collections: Collection[] } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'collections' in value &&
    Array.isArray(value.collections) &&
    value.collections.every(isCollection)
  )
}

// The server's order, « Été » before « Noël »: a created or renamed collection takes its place.
export function withCollection(collections: Collection[], collection: Collection): Collection[] {
  const others = collections.filter(({ id }) => id !== collection.id)
  return [...others, collection].sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}
