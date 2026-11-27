import { type Dispatch, type SetStateAction, useEffect, useState } from 'react'
import { useAuth } from '@/auth/AuthContext.ts'
import { createLiveLoads, type LiveLoads } from '@/liveLoads.ts'
import type { Photo } from '@/photo.ts'
import { withNewPhoto, withoutPhoto } from '@/photoList.ts'
import { connectPhotoSocket } from '@/photoSocket.ts'
import { fetchAllPhotos } from '@/photosApi.ts'

// Once a day: far below the 45 days left under which the server renews a session.
const SESSION_REFRESH_MS = 24 * 60 * 60 * 1000

// failed only before any photo arrived: a later failed refresh keeps the photos on screen.
export type FeedStatus = 'loading' | 'loaded' | 'failed'

export type PhotoFeed = {
  photos: Photo[]
  status: FeedStatus
}

type FeedSetters = {
  setPhotos: Dispatch<SetStateAction<Photo[]>>
  setStatus: Dispatch<SetStateAction<FeedStatus>>
}

function createFeedLoader(
  liveLoads: LiveLoads,
  { setPhotos, setStatus }: FeedSetters,
  dropUser: () => void,
): () => Promise<void> {
  return async () => {
    const loadId = liveLoads.begin()
    const loadedPhotos = await fetchAllPhotos(() => {
      if (liveLoads.isCurrent(loadId)) dropUser()
    })
    if (!liveLoads.isCurrent(loadId)) return
    if (!loadedPhotos) {
      setStatus((status) => (status === 'loaded' ? status : 'failed'))
      return
    }
    setPhotos(liveLoads.withLiveChanges(loadedPhotos))
    setStatus('loaded')
  }
}

function createPhotoAdder(
  liveLoads: LiveLoads,
  setPhotos: FeedSetters['setPhotos'],
): (photo: Photo) => void {
  return (photo) => {
    liveLoads.rememberAdded(photo)
    setPhotos((current) => withNewPhoto(current, photo))
  }
}

// Returns the cleanup that stops the socket, the timer and any load still running.
function connectPhotoFeed(setters: FeedSetters, dropUser: () => void): () => void {
  const { setPhotos } = setters
  const liveLoads = createLiveLoads()
  const load = createFeedLoader(liveLoads, setters, dropUser)
  const addPhoto = createPhotoAdder(liveLoads, setPhotos)

  // A received photo plays once opened, here or on another device: not on arrival.
  const socket = connectPhotoSocket({
    onConnect: load,
    onNewPhoto: addPhoto,
    onOpenedPhoto: addPhoto,
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
export function usePhotoFeed(): PhotoFeed {
  const { dropUser } = useAuth()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [status, setStatus] = useState<FeedStatus>('loading')

  useEffect(() => connectPhotoFeed({ setPhotos, setStatus }, dropUser), [dropUser])

  return { photos, status }
}
