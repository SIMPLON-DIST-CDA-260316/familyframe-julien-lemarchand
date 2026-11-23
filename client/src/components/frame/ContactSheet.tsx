import type { JSX } from 'react'
import type { Photo } from '@/photo.ts'

type ContactSheetProps = {
  photos: Photo[]
  currentId: string
  onSelect: (id: string) => void
}

export function ContactSheet({ photos, currentId, onSelect }: ContactSheetProps): JSX.Element {
  return (
    // pt-24 keeps the first row clear of the controls pill.
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-4 p-8 pt-24">
      {photos.map((photo) => (
        <li key={photo.id}>
          <button
            type="button"
            onClick={() => onSelect(photo.id)}
            aria-current={photo.id === currentId}
            className="group relative block w-full overflow-hidden rounded-xl outline-none ring-offset-4 ring-offset-frame-background focus-visible:ring-3 focus-visible:ring-ring aria-[current=true]:ring-2 aria-[current=true]:ring-frame-accent"
          >
            <img
              className="aspect-square w-full object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-105"
              src={photo.thumbnailUrl}
              alt={`Envoyée par ${photo.uploaderName}`}
              loading="lazy"
              decoding="async"
            />
            <span className="absolute inset-x-0 bottom-0 truncate bg-linear-to-t from-black/75 to-transparent px-3 pt-8 pb-2 text-left text-sm font-medium text-white">
              {photo.uploaderName}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
