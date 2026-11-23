import type { JSX } from 'react'
import type { Photo } from '@/photo.ts'

type ContactSheetProps = {
  photos: Photo[]
  onSelect: (id: string) => void
}

export function ContactSheet({ photos, onSelect }: ContactSheetProps): JSX.Element {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-3 p-4">
      {photos.map((photo) => (
        <li key={photo.id}>
          <button
            type="button"
            onClick={() => onSelect(photo.id)}
            className="group flex w-full flex-col gap-1 rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring"
          >
            <img
              className="aspect-square w-full rounded-lg object-cover transition-opacity group-hover:opacity-80"
              src={photo.thumbnailUrl}
              alt={`Envoyée par ${photo.uploaderName}`}
              loading="lazy"
              decoding="async"
            />
            <span className="truncate text-xs text-muted-foreground">{photo.uploaderName}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
