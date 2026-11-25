// The search parameter that names the open photo: /?photo=<id> on the library, /frame?photo=<id>.
export const PHOTO_PARAM = 'photo'

// The search parameter that plays a radio on the frame: /frame?radio=<id of its first photo>.
export const RADIO_PARAM = 'radio'

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

export function radioPath(photoId: string): string {
  return `/frame?${new URLSearchParams({ [RADIO_PARAM]: photoId })}`
}
