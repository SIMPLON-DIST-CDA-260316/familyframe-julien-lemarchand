import { type Dispatch, type SetStateAction, useEffect, useState } from 'react'
import { useAuth } from '@/auth/AuthContext.ts'
import type { Photo } from '@/photo.ts'
import { withLiveChanges, withNewPhoto, withoutPhoto } from '@/photoList.ts'
import { connectPhotoSocket } from '@/photoSocket.ts'
import { fetchAllPhotos } from '@/photosApi.ts'

// Once a day: far below the 45 days left under which the server renews a session.
const SESSION_REFRESH_MS = 24 * 60 * 60 * 1000

type PhotoSetter = Dispatch<SetStateAction<Photo[]>>

type PhotoLibrary = {
  load: () => Promise<void>
  rememberAdded: (photo: Photo) => void
  rememberDeleted: (id: string) => void
  stop: () => void
}

// Only the latest load applies its result, on top of the events received while it ran.
// Stopping makes every running load stale.
function createPhotoLibrary(setPhotos: PhotoSetter, dropUser: () => void): PhotoLibrary {
  let latestLoadId = 0
  let addedPhotos: Photo[] = []
  let deletedIds: string[] = []

  async function load(): Promise<void> {
    latestLoadId += 1
    const loadId = latestLoadId
    addedPhotos = []
    deletedIds = []
    const loadedPhotos = await fetchAllPhotos(() => {
      if (loadId === latestLoadId) dropUser()
    })
    if (!loadedPhotos || loadId !== latestLoadId) return
    setPhotos(withLiveChanges(loadedPhotos, addedPhotos, deletedIds))
  }

  return {
    load,
    rememberAdded: (photo) => addedPhotos.push(photo),
    rememberDeleted: (id) => deletedIds.push(id),
    stop: () => {
      latestLoadId += 1
    },
  }
}

// Returns the cleanup that stops the socket, the timer and any load still running.
function connectPhotoFeed(setPhotos: PhotoSetter, dropUser: () => void): () => void {
  const library = createPhotoLibrary(setPhotos, dropUser)

  const socket = connectPhotoSocket({
    onConnect: library.load,
    onNewPhoto: (photo) => {
      library.rememberAdded(photo)
      setPhotos((current) => withNewPhoto(current, photo))
    },
    // The whole library is loaded: no gap to fill, the photo just leaves the list.
    onDeletedPhoto: (id) => {
      library.rememberDeleted(id)
      setPhotos((current) => withoutPhoto(current, id))
    },
    onRefused: dropUser,
  })

  // An HTTP call slides the session, the socket handshake does not: without it a frame
  // that never reconnects would see its session expire. It also refreshes the feed.
  const refreshTimer = setInterval(library.load, SESSION_REFRESH_MS)

  return () => {
    clearInterval(refreshTimer)
    socket.disconnect()
    library.stop()
  }
}

// The whole library of the logged-in user, newest first like GET /api/photos.
export function usePhotoFeed(): Photo[] {
  const { dropUser } = useAuth()
  const [photos, setPhotos] = useState<Photo[]>([])

  useEffect(() => connectPhotoFeed(setPhotos, dropUser), [dropUser])

  return photos
}
