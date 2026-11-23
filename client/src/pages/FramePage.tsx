import { type JSX, useEffect, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { isPhoto, type Photo, type ServerToClientEvents } from '../photo.ts'

// The frame is a screen on a wall: dark keeps the photos in front.
const FRAME_CLASSES = 'dark min-h-svh bg-background p-4 text-foreground'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR')
}

export default function FramePage(): JSX.Element {
  // Newest first, like GET /api/photos.
  const [photos, setPhotos] = useState<Photo[]>([])

  useEffect(() => {
    async function loadPhotos(): Promise<void> {
      try {
        const res = await fetch('/api/photos')
        const data: unknown = await res.json()
        if (Array.isArray(data) && data.every(isPhoto)) {
          setPhotos(data)
        }
      } catch (error) {
        console.error('Could not load photos', error)
      }
    }

    // Same origin: Vite proxies /socket.io to the API.
    const socket: Socket<ServerToClientEvents> = io()

    // Reconnections too: catches photos sent while offline.
    socket.on('connect', loadPhotos)

    socket.on('photo:new', (photo) => {
      // The fetch and the event can bring the same photo.
      setPhotos((current) =>
        current.some(({ id }) => id === photo.id) ? current : [photo, ...current],
      )
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  if (photos.length === 0) {
    return (
      <main className={FRAME_CLASSES}>
        <p className="mt-[40vh] text-center text-muted-foreground">
          En attente de la première photo…
        </p>
      </main>
    )
  }

  const [latest, ...others] = photos

  return (
    <main className={FRAME_CLASSES}>
      <figure className="mb-6 flex flex-col items-center gap-2">
        <img
          className="h-[70vh] w-full object-contain"
          src={latest.url}
          alt={`Envoyée par ${latest.uploaderName}`}
          // The photo people look at: ahead of the thumbnails.
          fetchPriority="high"
        />
        <figcaption className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{latest.uploaderName}</span> ·{' '}
          {formatDate(latest.createdAt)}
        </figcaption>
      </figure>

      {others.length > 0 && (
        <ul className="flex flex-wrap justify-center gap-3">
          {others.map((photo) => (
            <li key={photo.id} className="flex flex-col items-center gap-1">
              <img
                className="size-32 rounded-lg object-cover"
                src={photo.thumbnailUrl}
                alt={`Envoyée par ${photo.uploaderName}`}
                loading="lazy"
                decoding="async"
              />
              <span className="text-xs text-muted-foreground">{photo.uploaderName}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
