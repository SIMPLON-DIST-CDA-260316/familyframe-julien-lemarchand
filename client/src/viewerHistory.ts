// The search parameter that names the open photo: /?photo=<id> on the library, /frame?photo=<id>.
export const PHOTO_PARAM = 'photo'

// Set on an entry pushed over the library: closing goes back to that entry instead of adding one.
export const LIBRARY_BELOW_STATE = { isLibraryBelow: true }

export type PhotoPage = '/' | '/frame'

export function isLibraryBelow(state: unknown): boolean {
  return (
    typeof state === 'object' &&
    state !== null &&
    'isLibraryBelow' in state &&
    state.isLibraryBelow === true
  )
}

export function photoPath(page: PhotoPage, photoId: string): string {
  return `${page}?${new URLSearchParams({ [PHOTO_PARAM]: photoId })}`
}
