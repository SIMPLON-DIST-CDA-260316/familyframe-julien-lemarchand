import type { JSX } from 'react'
import { PhotoActionsMenu } from '@/components/frame/PhotoActionsMenu.tsx'
import { useTileContextMenu } from '@/hooks/useTileContextMenu.ts'
import type { Photo } from '@/photo.ts'
import { photoLabel } from '@/photoLabel.ts'

// focus-visible:z-10: with 4 px gaps on a phone, the next tiles would paint over the focus ring.
const TILE_CLASSES =
  'group relative block w-full overflow-hidden rounded-sm outline-none ring-offset-2 ring-offset-background focus-visible:z-10 focus-visible:ring-3 focus-visible:ring-ring sm:rounded-xl sm:ring-offset-4 aria-[current=true]:ring-2 aria-[current=true]:ring-frame-accent'

// The touch callout (« Enregistrer l'image »…) would fight the long-press menu.
const IMAGE_CLASSES =
  'aspect-square w-full object-cover [-webkit-touch-callout:none] select-none motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover/tile:scale-105'

// A dark pill whatever the theme: it sits on the photo, not on the page. Under a finger it keeps
// the mouse's 28 px look, 4 px from the corner, so it hides little of a ~115 px phone tile; an
// invisible `after` 8 px wider on each side gives the finger its 44 px. z-10: stays above its own
// tile when that tile is focused.
const ELLIPSIS_CLASSES =
  'absolute top-2 right-2 z-10 rounded-full bg-black/55 text-white/80 backdrop-blur-sm hover:bg-black/75 hover:text-white aria-expanded:bg-black/75 aria-expanded:text-white dark:hover:bg-black/75 pointer-coarse:top-1 pointer-coarse:right-1 pointer-coarse:size-7 pointer-coarse:after:absolute pointer-coarse:after:-inset-2'

type PhotoGridTileProps = {
  photo: Photo
  isCurrent: boolean
  onSelect: (id: string) => void
}

// The ellipsis is a sibling of the tile button: a button cannot hold a button.
export function PhotoGridTile({ photo, isCurrent, onSelect }: PhotoGridTileProps): JSX.Element {
  const { tileProps, menuProps } = useTileContextMenu(() => onSelect(photo.id))
  return (
    <li className="group/tile relative">
      <button
        type="button"
        {...tileProps}
        aria-current={isCurrent}
        // The viewer focuses this tile when it closes on this photo.
        data-photo-id={photo.id}
        className={TILE_CLASSES}
      >
        <img
          className={IMAGE_CLASSES}
          src={photo.thumbnailUrl}
          alt={photoLabel(photo)}
          loading="lazy"
          decoding="async"
        />
      </button>
      <PhotoActionsMenu
        photo={photo}
        label={`Actions : ${photoLabel(photo)}`}
        theme="app"
        className={ELLIPSIS_CLASSES}
        {...menuProps}
      />
    </li>
  )
}
