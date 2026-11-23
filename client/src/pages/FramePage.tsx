import { type JSX, useEffect, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { errorMessage } from '../api.ts'
import { Button } from '../components/ui/button.tsx'
import { isPhoto, type Photo, type ServerToClientEvents } from '../photo.ts'

// The frame is a screen on a wall: dark keeps the photos in front.
const FRAME_CLASSES = 'dark min-h-svh bg-background p-4 text-foreground'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR')
}

// The list is not touched here: the server's photo:deleted reaches every frame, this one included.
async function deletePhoto({ id, uploaderName }: Photo): Promise<void> {
  if (!window.confirm(`Supprimer la photo envoyée par ${uploaderName} ?`)) return
  try {
    const res = await fetch(`/api/photos/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      // Not JSON when the dev proxy answers for a stopped API.
      const data: unknown = await res.json().catch(() => null)
      window.alert(errorMessage(data))
    }
  } catch {
    window.alert(errorMessage(null))
  }
}

function DeleteButton({ photo }: { photo: Photo }): JSX.Element {
  return (
    <Button variant="destructive" size="xs" onClick={() => deletePhoto(photo)}>
      Supprimer
    </Button>
  )
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
        } else {
          // Client and API images out of sync: say so instead of waiting forever.
          console.error('Unexpected photos payload from the API')
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

    socket.on('photo:deleted', (deletedId) => {
      if (typeof deletedId !== 'string') {
        console.error('Unexpected photo:deleted payload from the API')
        return
      }
      setPhotos((current) => current.filter(({ id }) => id !== deletedId))
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
        <DeleteButton photo={latest} />
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
              <DeleteButton photo={photo} />
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
