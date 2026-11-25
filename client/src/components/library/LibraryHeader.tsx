import { PlayIcon, PlusIcon } from 'lucide-react'
import type { JSX } from 'react'
import { Link } from 'react-router'
import { LayoutToggle } from '@/components/frame/LayoutToggle.tsx'
import { libraryCountLabel } from '@/components/library/libraryTexts.ts'
import { Button } from '@/components/ui/button.tsx'
import { enterFullscreen } from '@/fullscreen.ts'
import type { LibraryLayout } from '@/hooks/useLibraryLayout.ts'
import type { PhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
import { LIBRARY_BELOW_STATE } from '@/viewerHistory.ts'

type LibraryHeaderProps = {
  library: PhotoLibrary
  layout: LibraryLayout
  onLayoutChange: (layout: LibraryLayout) => void
  onAdd: () => void
}

function FrameModeButton(): JSX.Element {
  return (
    <Button
      asChild
      size="lg"
      className="rounded-full bg-frame-accent px-4 text-black hover:bg-frame-accent/85 pointer-coarse:h-11"
    >
      {/* The state: leaving the frame comes back to this library entry. Full screen is asked on
          the click itself: browsers grant it only during a user gesture. */}
      <Link to="/frame" state={LIBRARY_BELOW_STATE} onClick={enterFullscreen}>
        <PlayIcon data-icon="inline-start" />
        Mode cadre
      </Link>
    </Button>
  )
}

export function LibraryHeader({
  library,
  layout,
  onLayoutChange,
  onAdd,
}: LibraryHeaderProps): JSX.Element {
  return (
    // Wraps on a phone: the actions go under the title there.
    <header className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <div className="flex min-w-0 flex-col">
        <h1 className="text-2xl font-semibold tracking-tight">Bibliothèque</h1>
        <p className="min-h-5 text-sm text-muted-foreground">
          {library.isFirstPageLoaded && libraryCountLabel(library.photos.length, library.hasMore)}
        </p>
      </div>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        <Button size="lg" className="pointer-coarse:h-11" onClick={onAdd}>
          <PlusIcon aria-hidden data-icon="inline-start" />
          Ajouter
        </Button>
        <FrameModeButton />
        <LayoutToggle layout={layout} onLayoutChange={onLayoutChange} />
      </div>
    </header>
  )
}
