import { PlayIcon, PlusIcon } from 'lucide-react'
import type { JSX, ReactNode, RefObject } from 'react'
import { Link } from 'react-router'
import { LayoutToggle } from '@/components/frame/LayoutToggle.tsx'
import { Button } from '@/components/ui/button.tsx'
import { enterFullscreen } from '@/fullscreen.ts'
import type { LibraryLayout } from '@/hooks/useLibraryLayout.ts'
import { LIBRARY_BELOW_STATE } from '@/viewerHistory.ts'

type LibraryHeaderProps = {
  title: JSX.Element
  layout: LibraryLayout
  onLayoutChange: (layout: LibraryLayout) => void
  onAdd: () => void
  // The add and send panels give focus back to « Ajouter » when they close.
  addButtonRef: RefObject<HTMLButtonElement | null>
}

type LibraryTitleProps = {
  // What the page shows: « Toutes les photos », a collection's name, or « Bibliothèque » while
  // it is not known yet.
  name: string
  subtitle: string | null
  // The phone's title is the button that opens the collections.
  sheetButton: ReactNode
  // A shown collection's « … » menu, right after its name.
  actions?: ReactNode
}

export function LibraryTitle({
  name,
  subtitle,
  sheetButton,
  actions,
}: LibraryTitleProps): JSX.Element {
  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex min-w-0 items-center gap-1">
        <h1 className="text-2xl font-semibold tracking-tight wrap-anywhere">
          <span className="hidden md:inline">{name}</span>
          {sheetButton}
        </h1>
        {actions}
      </div>
      <p className="min-h-5 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  )
}

function FrameModeButton(): JSX.Element {
  return (
    <Button
      asChild
      size="lg"
      // A phone opens the frame from the tab bar instead.
      className="hidden rounded-full bg-frame-accent px-4 text-frame-accent-foreground hover:bg-frame-accent/85 md:inline-flex"
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
