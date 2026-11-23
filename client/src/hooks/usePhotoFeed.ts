import { useEffect, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { isPhoto, type Photo, type ServerToClientEvents } from '@/photo.ts'

// null keeps the photos already shown when a reload fails.
async function fetchPhotos(): Promise<Photo[] | null> {
  try {
    const res = await fetch('/api/photos')
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

// Newest first, like GET /api/photos.
export function usePhotoFeed(): Photo[] {
  const [photos, setPhotos] = useState<Photo[]>([])

  useEffect(() => {
    // Same origin: Vite proxies /socket.io to the API.
    const socket: Socket<ServerToClientEvents> = io()

    async function loadPhotos(): Promise<void> {
      const loadedPhotos = await fetchPhotos()
      if (loadedPhotos) setPhotos(loadedPhotos)
    }

    // Reconnections too: catches photos sent while offline.
    socket.on('connect', loadPhotos)

    socket.on('photo:new', (photo) => {
      // Socket.IO types are a promise, not a check.
      if (!isPhoto(photo)) {
        console.error('Unexpected photo:new payload from the API')
        return
      }
      // The fetch and the event can bring the same photo.
      setPhotos((current) =>
        current.some(({ id }) => id === photo.id) ? current : [photo, ...current],
      )
    })

    // Reload rather than drop one photo: the next photo beyond the 20 latest fills the gap.
    socket.on('photo:deleted', loadPhotos)

    return () => {
      socket.disconnect()
    }
  }, [])

  return photos
}
