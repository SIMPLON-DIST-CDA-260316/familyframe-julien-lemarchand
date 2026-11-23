import { type Dispatch, type SetStateAction, useEffect, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { UNAUTHORIZED_STATUS } from '@/api.ts'
import { useAuth } from '@/auth/AuthContext.ts'
import { isPhoto, type Photo, type ServerToClientEvents } from '@/photo.ts'

// The message the server's Socket.IO middleware rejects a handshake with, like the HTTP code.
const UNAUTHENTICATED_SOCKET_ERROR = 'UNAUTHENTICATED'

// Once a day: far below the 45 days left under which the server renews a session.
const SESSION_REFRESH_MS = 24 * 60 * 60 * 1000

// null keeps the photos already shown when a reload fails.
async function fetchPhotos(onUnauthenticated: () => void): Promise<Photo[] | null> {
  try {
    const res = await fetch('/api/photos')
    if (res.status === UNAUTHORIZED_STATUS) {
      onUnauthenticated()
      return null
    }
    const data: unknown = await res.json()
    if (Array.isArray(data) && data.every(isPhoto)) return data
    // Client and API images out of sync: say so instead of waiting forever.
    console.error('Unexpected photos payload from the API')
    return null
  } catch (error) {
    console.error('Could not load photos', error)
    return null
  }
}

// The fetch and the event can bring the same photo.
function withNewPhoto(photos: Photo[], photo: Photo): Photo[] {
  return photos.some(({ id }) => id === photo.id) ? photos : [photo, ...photos]
}

// Socket.IO types are a promise, not a check.
function addPhotoIfValid(photo: unknown, setPhotos: Dispatch<SetStateAction<Photo[]>>): void {
  if (!isPhoto(photo)) {
    console.error('Unexpected photo:new payload from the API')
    return
  }
  setPhotos((current) => withNewPhoto(current, photo))
}

// Socket.IO does not retry a handshake its server refused: back to /login.
function dropUserIfRefused({ message }: Error, dropUser: () => void): void {
  if (message === UNAUTHENTICATED_SOCKET_ERROR) dropUser()
}

// Returns the cleanup that stops the socket and the timer.
function connectPhotoFeed(
  setPhotos: Dispatch<SetStateAction<Photo[]>>,
  dropUser: () => void,
): () => void {
  // Same origin: Vite proxies /socket.io to the API, the session cookie goes with it.
  const socket: Socket<ServerToClientEvents> = io()

  async function loadPhotos(): Promise<void> {
    const loadedPhotos = await fetchPhotos(dropUser)
    if (loadedPhotos) setPhotos(loadedPhotos)
  }

  // Reconnections too: catches photos sent while offline.
  socket.on('connect', loadPhotos)
  socket.on('connect_error', (error) => dropUserIfRefused(error, dropUser))
  socket.on('photo:new', (photo) => addPhotoIfValid(photo, setPhotos))

  // Reload rather than drop one photo: the next photo beyond the 20 latest fills the gap.
  socket.on('photo:deleted', loadPhotos)

  // An HTTP call slides the session, the socket handshake does not: without it a frame
  // that never reconnects would see its session expire. It also refreshes the feed.
  const refreshTimer = setInterval(loadPhotos, SESSION_REFRESH_MS)

  return () => {
    clearInterval(refreshTimer)
    socket.disconnect()
  }
}

// Newest first, like GET /api/photos.
export function usePhotoFeed(): Photo[] {
  const { dropUser } = useAuth()
  const [photos, setPhotos] = useState<Photo[]>([])

  useEffect(() => connectPhotoFeed(setPhotos, dropUser), [dropUser])

  return photos
}
