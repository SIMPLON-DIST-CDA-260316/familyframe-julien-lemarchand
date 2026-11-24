import type { Photo } from '@/photo.ts'
import { withLiveChanges, withoutPhoto } from '@/photoList.ts'

export type LiveLoads = {
  begin: () => number
  isCurrent: (loadId: number) => boolean
  rememberAdded: (photo: Photo) => void
  rememberDeleted: (id: string) => void
  withLiveChanges: (loadedPhotos: Photo[]) => Photo[]
  withoutDeleted: (loadedPhotos: Photo[]) => Photo[]
  stop: () => void
}

// A load takes time: only the latest one may apply its result, on top of the socket events
// received while it ran. Stopping makes every running load stale.
export function createLiveLoads(): LiveLoads {
  let latestLoadId = 0
  let addedPhotos: Photo[] = []
  let deletedIds: string[] = []

  return {
    begin: () => {
      latestLoadId += 1
      addedPhotos = []
      deletedIds = []
      return latestLoadId
    },
    isCurrent: (loadId) => loadId === latestLoadId,
    rememberAdded: (photo) => addedPhotos.push(photo),
    rememberDeleted: (id) => deletedIds.push(id),
    withLiveChanges: (loadedPhotos) => withLiveChanges(loadedPhotos, addedPhotos, deletedIds),
    withoutDeleted: (loadedPhotos) => deletedIds.reduce(withoutPhoto, loadedPhotos),
    stop: () => {
      latestLoadId += 1
    },
  }
}
