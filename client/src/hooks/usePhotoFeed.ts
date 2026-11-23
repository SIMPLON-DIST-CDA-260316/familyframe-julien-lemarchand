import { useEffect, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { UNAUTHORIZED_STATUS } from '@/api.ts'
import { useAuth } from '@/auth/AuthContext.ts'
import { isPhoto, type Photo, type ServerToClientEvents } from '@/photo.ts'

// The message the server's Socket.IO middleware rejects a handshake with, like the HTTP code.
const UNAUTHENTICATED_SOCKET_ERROR = 'UNAUTHENTICATED'

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

// Newest first, like GET /api/photos.
export function usePhotoFeed(): Photo[] {
  const { dropUser } = useAuth()
  const [photos, setPhotos] = useState<Photo[]>([])

  useEffect(() => {
    // Same origin: Vite proxies /socket.io to the API, the session cookie goes with it.
    const socket: Socket<ServerToClientEvents> = io()

    async function loadPhotos(): Promise<void> {
      const loadedPhotos = await fetchPhotos(dropUser)
      if (loadedPhotos) setPhotos(loadedPhotos)
    }

    // Reconnections too: catches photos sent while offline.
    socket.on('connect', loadPhotos)

    // Socket.IO does not retry a handshake its server refused: back to /login.
    socket.on('connect_error', ({ message }) => {
      if (message === UNAUTHENTICATED_SOCKET_ERROR) dropUser()
    })

    socket.on('photo:new', (photo) => {
      // Socket.IO types are a promise, not a check.
      if (!isPhoto(photo)) {
        console.error('Unexpected photo:new payload from the API')
        return
      }
      setPhotos((current) => withNewPhoto(current, photo))
    })

    // Reload rather than drop one photo: the next photo beyond the 20 latest fills the gap.
    socket.on('photo:deleted', loadPhotos)

    return () => {
      socket.disconnect()
    }
  }, [dropUser])

  return photos
}
