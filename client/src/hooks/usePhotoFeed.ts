import { type Dispatch, type SetStateAction, useEffect, useState } from 'react'
import { useAuth } from '@/auth/AuthContext.ts'
import { createLiveLoads, type LiveLoads } from '@/liveLoads.ts'
import type { Photo } from '@/photo.ts'
import { withNewPhoto, withoutPhoto } from '@/photoList.ts'
import { connectPhotoSocket } from '@/photoSocket.ts'
import { fetchAllPhotos } from '@/photosApi.ts'

// Once a day: far below the 45 days left under which the server renews a session.
const SESSION_REFRESH_MS = 24 * 60 * 60 * 1000

type PhotoSetter = Dispatch<SetStateAction<Photo[]>>

function createFeedLoader(
  liveLoads: LiveLoads,
  setPhotos: PhotoSetter,
  dropUser: () => void,
): () => Promise<void> {
  return async () => {
    const loadId = liveLoads.begin()
    const loadedPhotos = await fetchAllPhotos(() => {
      if (liveLoads.isCurrent(loadId)) dropUser()
    })
    if (!loadedPhotos || !liveLoads.isCurrent(loadId)) return
    setPhotos(liveLoads.withLiveChanges(loadedPhotos))
  }
}

// Returns the cleanup that stops the socket, the timer and any load still running.
function connectPhotoFeed(setPhotos: PhotoSetter, dropUser: () => void): () => void {
  const liveLoads = createLiveLoads()
  const load = createFeedLoader(liveLoads, setPhotos, dropUser)

  const socket = connectPhotoSocket({
    onConnect: load,
    onNewPhoto: (photo) => {
      liveLoads.rememberAdded(photo)
      setPhotos((current) => withNewPhoto(current, photo))
    },
    // The whole library is loaded: no gap to fill, the photo just leaves the list.
    onDeletedPhoto: (id) => {
      liveLoads.rememberDeleted(id)
      setPhotos((current) => withoutPhoto(current, id))
    },
    onRefused: dropUser,
  })

  // An HTTP call slides the session, the socket handshake does not: without it a frame
  // that never reconnects would see its session expire. It also refreshes the feed.
  const refreshTimer = setInterval(load, SESSION_REFRESH_MS)

  return () => {
    clearInterval(refreshTimer)
    socket.disconnect()
    liveLoads.stop()
  }
}

// The whole library of the logged-in user, newest first like GET /api/photos.
export function usePhotoFeed(): Photo[] {
  const { dropUser } = useAuth()
  const [photos, setPhotos] = useState<Photo[]>([])

  useEffect(() => connectPhotoFeed(setPhotos, dropUser), [dropUser])

  return photos
}
