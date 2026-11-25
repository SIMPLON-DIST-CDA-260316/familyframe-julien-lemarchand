import type { JSX } from 'react'
import { PhotoGrid } from '@/components/frame/PhotoGrid.tsx'
import { PhotoList } from '@/components/frame/PhotoList.tsx'
import { Button } from '@/components/ui/button.tsx'
import type { LibraryLayout } from '@/hooks/useLibraryLayout.ts'
import type { PhotoLibrary } from '@/hooks/usePhotoLibrary.ts'

type LibrarySectionProps = {
  library: PhotoLibrary
  layout: LibraryLayout
  onOpenPhoto: (id: string) => void
  // The library and a collection say different things when they have no photo.
  emptyState: JSX.Element
}

type LoadMoreButtonProps = Pick<PhotoLibrary, 'isLoadingMore' | 'loadMore'>

function LoadMoreButton({ isLoadingMore, loadMore }: LoadMoreButtonProps): JSX.Element {
  return (
    <div className="flex justify-center px-4 pb-6 sm:px-8 sm:pb-8">
      <Button
        variant="outline"
        className="pointer-coarse:h-11"
        onClick={loadMore}
        disabled={isLoadingMore}
      >
        {isLoadingMore ? 'Chargement…' : 'Charger plus'}
      </Button>
    </div>
  )
}

function LibraryPhotos({
  library,
  layout,
  onOpenPhoto,
  emptyState,
}: LibrarySectionProps): JSX.Element {
  if (!library.isFirstPageLoaded) {
    return <p className="px-6 py-16 text-center text-muted-foreground">Chargement…</p>
  }
  if (library.photos.length === 0) return emptyState
  // currentId null: no photo is on screen here, so no tile gets the frame's ring.
  return layout === 'grid' ? (
    <PhotoGrid photos={library.photos} currentId={null} onSelect={onOpenPhoto} />
  ) : (
    <PhotoList photos={library.photos} currentId={null} onSelect={onOpenPhoto} />
  )
}

export function LibrarySection(props: LibrarySectionProps): JSX.Element {
  const { hasMore, isLoadingMore, loadMore } = props.library

  return (
    // `dark` and the frame background: the frame's components look as designed.
    <section aria-label="Photos" className="dark rounded-2xl bg-frame-background text-foreground">
      <LibraryPhotos {...props} />
      {hasMore && <LoadMoreButton isLoadingMore={isLoadingMore} loadMore={loadMore} />}
    </section>
  )
}
