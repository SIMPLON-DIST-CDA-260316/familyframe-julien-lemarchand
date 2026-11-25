import { PlayIcon } from 'lucide-react'
import type { JSX } from 'react'
import { Link } from 'react-router'
import { LayoutToggle } from '@/components/frame/LayoutToggle.tsx'
import { PhotoGrid } from '@/components/frame/PhotoGrid.tsx'
import { PhotoList } from '@/components/frame/PhotoList.tsx'
import { Button } from '@/components/ui/button.tsx'
import { enterFullscreen } from '@/fullscreen.ts'
import type { LibraryLayout } from '@/hooks/useLibraryLayout.ts'
import { useLibraryLayout } from '@/hooks/useLibraryLayout.ts'
import type { PhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
import type { Photo } from '@/photo.ts'
import { LIBRARY_BELOW_STATE } from '@/viewerHistory.ts'

type LibrarySectionProps = {
  library: PhotoLibrary
  onOpenPhoto: (id: string) => void
}

type LibraryPhotosProps = {
  photos: Photo[]
  layout: LibraryLayout
  onSelect: (id: string) => void
}

type LibraryHeaderProps = {
  layout: LibraryLayout
  onLayoutChange: (layout: LibraryLayout) => void
}

type LoadMoreButtonProps = Pick<PhotoLibrary, 'isLoadingMore' | 'loadMore'>

function LibraryPhotos({ photos, layout, onSelect }: LibraryPhotosProps): JSX.Element {
  if (photos.length === 0) {
    return <p className="px-8 py-10 text-muted-foreground">Aucune photo pour l'instant.</p>
  }
  // currentId null: no photo is on screen here, so no tile gets the frame's ring.
  return layout === 'grid' ? (
    <PhotoGrid photos={photos} currentId={null} onSelect={onSelect} />
  ) : (
    <PhotoList photos={photos} currentId={null} onSelect={onSelect} />
  )
}

function LibrarySectionHeader({ layout, onLayoutChange }: LibraryHeaderProps): JSX.Element {
  return (
    // Wraps on a phone: the title, the pill and the toggle do not fit on one line there.
    <header className="flex flex-wrap items-center gap-x-4 gap-y-3 px-8 pt-6">
      <h2 id="library-title" className="text-xl font-medium tracking-tight">
        Ma bibliothèque
      </h2>
      <div className="ml-auto flex items-center gap-2">
        <Button
          asChild
          size="lg"
          className="rounded-full bg-frame-accent px-4 text-black hover:bg-frame-accent/85"
        >
          {/* The state: leaving the frame comes back to this library entry. Full screen is asked
              on the click itself: browsers grant it only during a user gesture. */}
          <Link to="/frame" state={LIBRARY_BELOW_STATE} onClick={enterFullscreen}>
            <PlayIcon data-icon="inline-start" />
            Mode cadre
          </Link>
        </Button>
        <LayoutToggle layout={layout} onLayoutChange={onLayoutChange} />
      </div>
    </header>
  )
}

function LoadMoreButton({ isLoadingMore, loadMore }: LoadMoreButtonProps): JSX.Element {
  return (
    <div className="flex justify-center px-8 pb-8">
      <Button variant="outline" onClick={loadMore} disabled={isLoadingMore}>
        {isLoadingMore ? 'Chargement…' : 'Charger plus'}
      </Button>
    </div>
  )
}

export function LibrarySection({ library, onOpenPhoto }: LibrarySectionProps): JSX.Element {
  const [layout, setLayout] = useLibraryLayout()
  const { photos, hasMore, isLoadingMore, loadMore } = library

  return (
    // `dark` and the frame background: the frame's components look as designed.
    <section
      aria-labelledby="library-title"
      className="dark rounded-2xl bg-frame-background text-foreground"
    >
      <LibrarySectionHeader layout={layout} onLayoutChange={setLayout} />
      <LibraryPhotos photos={photos} layout={layout} onSelect={onOpenPhoto} />
      {hasMore && <LoadMoreButton isLoadingMore={isLoadingMore} loadMore={loadMore} />}
    </section>
  )
}
