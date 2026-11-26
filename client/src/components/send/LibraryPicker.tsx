import type { JSX } from 'react'
import { LibraryPhotoGrid } from '@/components/library/LibraryPhotoGrid.tsx'
import type { Photo } from '@/photo.ts'
import { photoLabel } from '@/photoLabel.ts'

function PhotoChoice({ photo, onPick }: { photo: Photo; onPick: () => void }): JSX.Element {
  return (
    <li>
      <button
        type="button"
        aria-label={photoLabel(photo)}
        className="block aspect-square w-full overflow-hidden rounded-md bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        onClick={onPick}
      >
        <img src={photo.thumbnailUrl} alt="" loading="lazy" className="size-full object-cover" />
      </button>
    </li>
  )
}

// One photo to send: a touch picks it.
export function LibraryPicker({ onPick }: { onPick: (photo: Photo) => void }): JSX.Element {
  return (
    <LibraryPhotoGrid
      renderPhoto={(photo) => (
        <PhotoChoice key={photo.id} photo={photo} onPick={() => onPick(photo)} />
      )}
    />
  )
}
