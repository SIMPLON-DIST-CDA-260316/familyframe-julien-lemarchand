import type { JSX, ReactNode } from 'react'
import { Button } from '@/components/ui/button.tsx'
import { usePhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
import type { Photo } from '@/photo.ts'

type LibraryPhotoGridProps = {
  // One <li> per photo: each picker draws its own tile.
  renderPhoto: (photo: Photo) => ReactNode
}

// The whole library, newest first, as on the library page; a received photo is there once opened.
// The grid scrolls inside its panel: « Charger plus », the ✕ and a footer stay reachable.
export function LibraryPhotoGrid({ renderPhoto }: LibraryPhotoGridProps): JSX.Element {
  const library = usePhotoLibrary(null)
  if (!library.isFirstPageLoaded) {
    return <p className="text-sm text-muted-foreground">Chargement…</p>
  }
  if (library.photos.length === 0) {
    return <p className="text-sm text-muted-foreground">Votre bibliothèque est vide.</p>
  }
  return (
    <div className="flex max-h-[55svh] flex-col gap-3 overflow-y-auto">
      <ul className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">{library.photos.map(renderPhoto)}</ul>
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
