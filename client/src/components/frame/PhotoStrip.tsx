import type { JSX } from 'react'
import type { Photo } from '@/photo.ts'

type PhotoStripProps = {
  photos: Photo[]
  currentId: string
  onSelect: (id: string) => void
}

export function PhotoStrip({ photos, currentId, onSelect }: PhotoStripProps): JSX.Element {
  return (
    <ul className="pointer-events-auto flex items-center gap-2 overflow-x-auto px-4 pb-4">
      {photos.map((photo) => (
        <li key={photo.id} className="shrink-0">
          <button
            type="button"
            onClick={() => onSelect(photo.id)}
            aria-current={photo.id === currentId}
            className="block rounded-md opacity-60 outline-none transition-opacity hover:opacity-100 focus-visible:ring-3 focus-visible:ring-ring aria-[current=true]:opacity-100 aria-[current=true]:ring-2 aria-[current=true]:ring-primary"
          >
            <img
              className="size-24 rounded-md object-cover"
              src={photo.thumbnailUrl}
              alt={`Envoyée par ${photo.uploaderName}`}
              loading="lazy"
              decoding="async"
            />
          </button>
        </li>
      ))}
    </ul>
  )
}
