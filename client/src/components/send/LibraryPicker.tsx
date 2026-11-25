import type { JSX } from 'react'
import { Button } from '@/components/ui/button.tsx'
import { usePhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
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

// The whole library, newest first, as on the library page; a received photo is there once opened.
// The grid scrolls inside the panel: « Charger plus » and the ✕ stay reachable.
export function LibraryPicker({ onPick }: { onPick: (photo: Photo) => void }): JSX.Element {
  const library = usePhotoLibrary(null)
  if (!library.isFirstPageLoaded) {
    return <p className="text-sm text-muted-foreground">Chargement…</p>
  }
  if (library.photos.length === 0) {
    return <p className="text-sm text-muted-foreground">Votre bibliothèque est vide.</p>
  }
  return (
    <div className="flex max-h-[55svh] flex-col gap-3 overflow-y-auto">
      <ul className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
        {library.photos.map((photo) => (
          <PhotoChoice key={photo.id} photo={photo} onPick={() => onPick(photo)} />
        ))}
      </ul>
      {library.hasMore && (
        <Button
          variant="outline"
          className="self-center"
          disabled={library.isLoadingMore}
          onClick={library.loadMore}
        >
          {library.isLoadingMore ? 'Chargement…' : 'Charger plus'}
        </Button>
      )}
    </div>
  )
}
