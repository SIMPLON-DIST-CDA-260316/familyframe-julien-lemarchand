import { type Dispatch, type SetStateAction, useEffect, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useAuth } from '@/auth/AuthContext.ts'
import { isPhoto, type Photo, type ServerToClientEvents } from '@/photo.ts'
import { fetchAllPhotos } from '@/photosApi.ts'

// The message the server's Socket.IO middleware rejects a handshake with, like the HTTP code.
const UNAUTHENTICATED_SOCKET_ERROR = 'UNAUTHENTICATED'

// Once a day: far below the 45 days left under which the server renews a session.
const SESSION_REFRESH_MS = 24 * 60 * 60 * 1000

type PhotoSetter = Dispatch<SetStateAction<Photo[]>>

// The fetch and the event can bring the same photo.
function withNewPhoto(photos: Photo[], photo: Photo): Photo[] {
  return photos.some(({ id }) => id === photo.id) ? photos : [photo, ...photos]
}

// The whole library is loaded: no gap to fill, the photo just leaves the list.
function withoutPhoto(photos: Photo[], deletedId: string): Photo[] {
  return photos.filter(({ id }) => id !== deletedId)
}

// Socket.IO types are a promise, not a check.
function parsePhoto(photo: unknown): Photo | null {
  if (isPhoto(photo)) return photo
  console.error('Unexpected photo:new payload from the API')
  return null
}

// Socket.IO does not retry a handshake its server refused: back to /login.
function dropUserIfRefused({ message }: Error, dropUser: () => void): void {
  if (message === UNAUTHENTICATED_SOCKET_ERROR) dropUser()
}

// A load takes several requests: its pages predate the events received meanwhile.
function withLiveChanges(photos: Photo[], addedPhotos: Photo[], deletedIds: string[]): Photo[] {
  const withAddedPhotos = addedPhotos.reduce(withNewPhoto, photos)
  return deletedIds.reduce(withoutPhoto, withAddedPhotos)
}

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

function listenToLiveEvents(
  socket: Socket<ServerToClientEvents>,
  library: PhotoLibrary,
  setPhotos: PhotoSetter,
): void {
  socket.on('photo:new', (payload) => {
    const photo = parsePhoto(payload)
    if (!photo) return
    library.rememberAdded(photo)
    setPhotos((current) => withNewPhoto(current, photo))
  })
  socket.on('photo:deleted', (id) => {
    library.rememberDeleted(id)
    setPhotos((current) => withoutPhoto(current, id))
  })
}

// Returns the cleanup that stops the socket, the timer and any load still running.
function connectPhotoFeed(setPhotos: PhotoSetter, dropUser: () => void): () => void {
  // Same origin: Vite proxies /socket.io to the API, the session cookie goes with it.
  const socket: Socket<ServerToClientEvents> = io()
  const library = createPhotoLibrary(setPhotos, dropUser)

  // Reconnections too: catches photos sent while offline.
  socket.on('connect', library.load)
  socket.on('connect_error', (error) => dropUserIfRefused(error, dropUser))
  listenToLiveEvents(socket, library, setPhotos)

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
