import { type JSX, useEffect, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { isPhoto, type Photo, type ServerToClientEvents } from '../photo.ts'

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
        current.some((p) => p.id === photo.id) ? current : [photo, ...current],
      )
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  if (photos.length === 0) {
    return (
      <main className="frame">
        <p className="frame-empty">En attente de la première photo…</p>
      </main>
    )
  }

  const [latest, ...others] = photos

  return (
    <main className="frame">
      <figure className="frame-latest">
        <img src={latest.url} alt={`Envoyée par ${latest.uploaderName}`} />
        <figcaption>
          {latest.uploaderName} · {formatDate(latest.createdAt)}
        </figcaption>
      </figure>

      {others.length > 0 && (
        <ul className="frame-thumbs">
          {others.map((photo) => (
            <li key={photo.id}>
              <img src={photo.url} alt={`Envoyée par ${photo.uploaderName}`} />
              <span>{photo.uploaderName}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
