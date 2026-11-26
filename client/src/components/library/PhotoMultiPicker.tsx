import { CheckIcon } from 'lucide-react'
import type { JSX } from 'react'
import { LibraryPhotoGrid } from '@/components/library/LibraryPhotoGrid.tsx'
import type { PhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
import type { Photo } from '@/photo.ts'
import { photoLabel } from '@/photoLabel.ts'

// isIn: already in the collection, so ticked for good. isLocked: the choice is full.
type ToggleTileProps = {
  photo: Photo
  isChosen: boolean
  isIn: boolean
  isLocked: boolean
  onToggle: () => void
}

function ToggleTile({ photo, isChosen, isIn, isLocked, onToggle }: ToggleTileProps): JSX.Element {
  const label = isIn ? `${photoLabel(photo)}, déjà dans la collection` : photoLabel(photo)
  return (
    <li>
      <button
        type="button"
        aria-label={label}
        aria-pressed={isChosen || isIn}
        disabled={isIn || (isLocked && !isChosen)}
        className="relative block aspect-square w-full overflow-hidden rounded-md bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:outline-3 aria-pressed:-outline-offset-3 aria-pressed:outline-primary aria-pressed:outline-solid"
        onClick={onToggle}
      >
        <img src={photo.thumbnailUrl} alt="" loading="lazy" className="size-full object-cover" />
        {(isChosen || isIn) && (
          <span className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <CheckIcon aria-hidden className="size-4" />
          </span>
        )}
      </button>
    </li>
  )
}

type PhotoMultiPickerProps = {
  library: PhotoLibrary
  chosenIds: string[]
  // The collection's photos: shown ticked and disabled rather than hidden, so the grid stays the
  // library the user knows.
  inIds: string[]
  isFull: boolean
  onToggle: (photoId: string) => void
}

export function PhotoMultiPicker(props: PhotoMultiPickerProps): JSX.Element {
  const { library, chosenIds, inIds, isFull, onToggle } = props
  return (
    <LibraryPhotoGrid
      library={library}
      renderPhoto={(photo) => (
        <ToggleTile
          key={photo.id}
          photo={photo}
          isChosen={chosenIds.includes(photo.id)}
          isIn={inIds.includes(photo.id)}
          isLocked={isFull}
          onToggle={() => onToggle(photo.id)}
        />
      )}
    />
  )
}
