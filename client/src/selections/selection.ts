// Copy of server/src/types.ts, see why there. Keep both in sync.

// A selection names its photos by id: the frame finds them in the library it already holds.
export type Selection = { photoIds: string[] }

// unavailable: the selection could not load, the frame plays the library instead.
export type SelectedIds =
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'ready'; photoIds: string[] }

export function isSelection(value: unknown): value is Selection {
  return (
    typeof value === 'object' &&
    value !== null &&
    'photoIds' in value &&
    Array.isArray(value.photoIds) &&
    value.photoIds.every((photoId) => typeof photoId === 'string')
  )
}
