import type { JSX } from 'react'
import { PhotoGrid } from '@/components/frame/PhotoGrid.tsx'
import { PhotoList } from '@/components/frame/PhotoList.tsx'
import { LoadFailed } from '@/components/library/LibraryNotices.tsx'
import { LibrarySkeleton } from '@/components/library/LibrarySkeleton.tsx'
import {
  PendingAnnouncement,
  PendingGridTile,
  PendingListRow,
} from '@/components/library/PendingUploads.tsx'
import { Button } from '@/components/ui/button.tsx'
import type { LibraryLayout } from '@/hooks/useLibraryLayout.ts'
import type { PhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
import { dayKey, groupByDay, type PhotoDay, withToday } from '@/photoDays.ts'
import type { PendingUpload } from '@/upload/uploadQueue.ts'

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

// today: the day the uploads on their way sit in.
type LibraryDays = { days: PhotoDay[]; today: string }

// Every loaded page at once: « Charger plus » extends the last day instead of repeating it.
// An upload on its way belongs to today, even before today has a photo.
function libraryDays(library: PhotoLibrary, pending: PendingUpload[]): LibraryDays {
  const now = new Date()
  const days = groupByDay(library.photos, now)
  return { days: pending.length > 0 ? withToday(days, now) : days, today: dayKey(now) }
}

type FirstPageWaitProps = Pick<LibrarySectionProps, 'library' | 'layout'>

function FirstPageWait({ library, layout }: FirstPageWaitProps): JSX.Element {
  if (library.hasLoadFailed) return <LoadFailed onRetry={library.retry} />
  return <LibrarySkeleton layout={layout} />
}

function LibraryPhotos({
  library,
  layout,
  pending,
  onOpenPhoto,
  emptyState,
}: LibrarySectionProps): JSX.Element {
  if (!library.isFirstPageLoaded) return <FirstPageWait library={library} layout={layout} />
  if (library.photos.length === 0 && pending.length === 0) return emptyState
  const { days, today } = libraryDays(library, pending)
  // Newest first, like the photos: the upload in progress sits right above the photos, where
  // its photo appears once sent.
  const newestFirst = pending.toReversed()
  // currentId null: no photo is on screen here, so no tile gets the frame's ring.
  return layout === 'grid' ? (
    <PhotoGrid days={days} currentId={null} onSelect={onOpenPhoto} childrenDayKey={today}>
      {newestFirst.map((upload) => (
        <PendingGridTile key={upload.id} upload={upload} />
      ))}
    </PhotoGrid>
  ) : (
    <PhotoList days={days} currentId={null} onSelect={onOpenPhoto} childrenDayKey={today}>
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
