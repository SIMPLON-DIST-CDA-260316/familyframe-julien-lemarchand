import { PlayIcon, PlusIcon } from 'lucide-react'
import type { JSX, RefObject } from 'react'
import { Link } from 'react-router'
import { LayoutToggle } from '@/components/frame/LayoutToggle.tsx'
import { libraryCountLabel } from '@/components/library/libraryTexts.ts'
import { Button } from '@/components/ui/button.tsx'
import { enterFullscreen } from '@/fullscreen.ts'
import type { LibraryLayout } from '@/hooks/useLibraryLayout.ts'
import type { PhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
import { LIBRARY_BELOW_STATE } from '@/viewerHistory.ts'

type LibraryHeaderProps = {
  // LibraryTitle, or a shown collection's own title.
  title: JSX.Element
  layout: LibraryLayout
  onLayoutChange: (layout: LibraryLayout) => void
  onAdd: () => void
  // The add and send panels give focus back to « Ajouter » when they close.
  addButtonRef: RefObject<HTMLButtonElement | null>
}

type LibraryTitleProps = {
  library: PhotoLibrary
  // false over a collection that cannot be shown: its photos, if any were loaded, are stale.
  showsCount: boolean
}

export function LibraryTitle({ library, showsCount }: LibraryTitleProps): JSX.Element {
  return (
    <div className="flex min-w-0 flex-col">
      <h1 className="text-2xl font-semibold tracking-tight">Bibliothèque</h1>
      <p className="min-h-5 text-sm text-muted-foreground">
        {showsCount &&
          library.isFirstPageLoaded &&
          libraryCountLabel(library.photos.length, library.hasMore)}
      </p>
    </div>
  )
}

function FrameModeButton(): JSX.Element {
  return (
    <Button
      asChild
      size="lg"
      // A phone opens the frame from the tab bar instead.
      className="hidden rounded-full bg-frame-accent px-4 text-black hover:bg-frame-accent/85 md:inline-flex"
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
  title,
  layout,
  onLayoutChange,
  onAdd,
  addButtonRef,
}: LibraryHeaderProps): JSX.Element {
  return (
    // A phone has the floating « Ajouter » and the Cadre tab: only the layout toggle stays here.
    <header className="flex flex-wrap items-center gap-x-4 gap-y-3">
      {title}
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        <Button ref={addButtonRef} size="lg" className="hidden md:inline-flex" onClick={onAdd}>
          <PlusIcon aria-hidden data-icon="inline-start" />
          Ajouter
        </Button>
        <FrameModeButton />
        <LayoutToggle layout={layout} onLayoutChange={onLayoutChange} />
      </div>
    </header>
  )
}
