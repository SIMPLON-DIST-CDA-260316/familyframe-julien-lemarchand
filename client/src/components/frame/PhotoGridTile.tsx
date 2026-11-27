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

// 6 px from the corner, so the 32 px pill hides little of a ~115 px phone tile. z-10: stays above
// its own tile when that tile is focused.
const MORE_POSITION_CLASSES = 'absolute top-1.5 right-1.5 z-10'

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
        trigger={{ surface: 'photo', className: MORE_POSITION_CLASSES }}
        {...menuProps}
      />
    </li>
  )
}
