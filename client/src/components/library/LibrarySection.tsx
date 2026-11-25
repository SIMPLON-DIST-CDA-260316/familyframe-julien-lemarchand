import type { JSX } from 'react'
import { PhotoGrid } from '@/components/frame/PhotoGrid.tsx'
import { PhotoList } from '@/components/frame/PhotoList.tsx'
import {
  PendingAnnouncement,
  PendingGridTile,
  PendingListRow,
} from '@/components/library/PendingUploads.tsx'
import { Button } from '@/components/ui/button.tsx'
import type { LibraryLayout } from '@/hooks/useLibraryLayout.ts'
import type { PhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
import type { PendingUpload } from '@/hooks/usePhotoUploads.ts'

type LibrarySectionProps = {
  library: PhotoLibrary
  layout: LibraryLayout
  // The uploads chosen from the view shown, in the order they were chosen.
  pending: PendingUpload[]
  onOpenPhoto: (id: string) => void
  // The library and a collection say different things when they have no photo.
  emptyState: JSX.Element
}

type LoadMoreButtonProps = Pick<PhotoLibrary, 'isLoadingMore' | 'loadMore'>

function LoadMoreButton({ isLoadingMore, loadMore }: LoadMoreButtonProps): JSX.Element {
  return (
    <div className="flex justify-center pt-6">
      <Button variant="outline" onClick={loadMore} disabled={isLoadingMore}>
        {isLoadingMore ? 'Chargement…' : 'Charger plus'}
      </Button>
    </div>
  )
}

function LibraryPhotos({
  library,
  layout,
  pending,
  onOpenPhoto,
  emptyState,
}: LibrarySectionProps): JSX.Element {
  if (!library.isFirstPageLoaded) {
    return <p className="px-6 py-16 text-center text-muted-foreground">Chargement…</p>
  }
  if (library.photos.length === 0 && pending.length === 0) return emptyState
  // Newest first, like the photos: the upload in progress sits right above the photos, where
  // its photo appears once sent.
  const newestFirst = pending.toReversed()
  // currentId null: no photo is on screen here, so no tile gets the frame's ring.
  return layout === 'grid' ? (
    <PhotoGrid photos={library.photos} currentId={null} onSelect={onOpenPhoto}>
      {newestFirst.map((upload) => (
        <PendingGridTile key={upload.id} upload={upload} />
      ))}
    </PhotoGrid>
  ) : (
    <PhotoList photos={library.photos} currentId={null} onSelect={onOpenPhoto}>
      {newestFirst.map((upload) => (
        <PendingListRow key={upload.id} upload={upload} />
      ))}
    </PhotoList>
  )
}

export function LibrarySection(props: LibrarySectionProps): JSX.Element {
  const { hasMore, isLoadingMore, loadMore } = props.library

  return (
    // The page's own surface: the library follows the app's theme; only the frame is always dark.
    <section aria-label="Photos">
      <PendingAnnouncement count={props.pending.length} />
      <LibraryPhotos {...props} />
      {hasMore && <LoadMoreButton isLoadingMore={isLoadingMore} loadMore={loadMore} />}
    </section>
  )
}
