import type { JSX } from 'react'
import { PhotoActionsMenu } from '@/components/frame/PhotoActionsMenu.tsx'
import type { Photo } from '@/photo.ts'

type ContactSheetTileProps = {
  photo: Photo
  isCurrent: boolean
  onSelect: (id: string) => void
}

export function ContactSheetTile({
  photo,
  isCurrent,
  onSelect,
}: ContactSheetTileProps): JSX.Element {
  return (
    // The ellipsis is a sibling of the tile button: a button cannot hold a button.
    <li className="group/tile relative">
      <button
        type="button"
        onClick={() => onSelect(photo.id)}
        aria-current={isCurrent}
        className="group relative block w-full overflow-hidden rounded-xl outline-none ring-offset-4 ring-offset-frame-background focus-visible:ring-3 focus-visible:ring-ring aria-[current=true]:ring-2 aria-[current=true]:ring-frame-accent"
      >
        <img
          className="aspect-square w-full object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover/tile:scale-105"
          src={photo.thumbnailUrl}
          alt={`Envoyée par ${photo.uploaderName}`}
          loading="lazy"
          decoding="async"
        />
        <span className="absolute inset-x-0 bottom-0 truncate bg-linear-to-t from-black/75 to-transparent px-3 pt-8 pb-2 text-left text-sm font-medium text-white">
          {photo.uploaderName}
        </span>
      </button>
      <PhotoActionsMenu
        photo={photo}
        label={`Actions sur la photo envoyée par ${photo.uploaderName}`}
        className="absolute top-2 right-2 rounded-full bg-black/55 text-white/80 backdrop-blur-sm hover:bg-black/75 hover:text-white dark:hover:bg-black/75"
      />
    </li>
  )
}
