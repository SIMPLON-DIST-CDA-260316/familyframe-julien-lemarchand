import type { JSX } from 'react'
import { PhotoActionsMenu } from '@/components/frame/PhotoActionsMenu.tsx'
import type { Photo } from '@/photo.ts'
import { photoLabel } from '@/photoLabel.ts'

type PhotoGridTileProps = {
  photo: Photo
  isCurrent: boolean
  onSelect: (id: string) => void
}

export function PhotoGridTile({ photo, isCurrent, onSelect }: PhotoGridTileProps): JSX.Element {
  return (
    // The ellipsis is a sibling of the tile button: a button cannot hold a button.
    <li className="group/tile relative">
      <button
        type="button"
        onClick={() => onSelect(photo.id)}
        aria-current={isCurrent}
        // The viewer focuses this tile when it closes on this photo.
        data-photo-id={photo.id}
        className="group relative block w-full overflow-hidden rounded-xl outline-none ring-offset-4 ring-offset-background focus-visible:ring-3 focus-visible:ring-ring aria-[current=true]:ring-2 aria-[current=true]:ring-frame-accent"
      >
        <img
          className="aspect-square w-full object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover/tile:scale-105"
          src={photo.thumbnailUrl}
          alt={photoLabel(photo)}
          loading="lazy"
          decoding="async"
        />
      </button>
      {/* A dark pill whatever the theme: it sits on the photo, not on the page. */}
      <PhotoActionsMenu
        photo={photo}
        label={`Actions : ${photoLabel(photo)}`}
        theme="app"
        className="absolute top-2 right-2 rounded-full bg-black/55 text-white/80 backdrop-blur-sm hover:bg-black/75 hover:text-white aria-expanded:bg-black/75 aria-expanded:text-white dark:hover:bg-black/75"
      />
    </li>
  )
}
