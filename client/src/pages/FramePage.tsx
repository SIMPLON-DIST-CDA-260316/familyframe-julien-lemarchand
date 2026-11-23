import { ImagesIcon } from 'lucide-react'
import type { JSX } from 'react'
import { LibraryScreen } from '@/components/frame/LibraryScreen.tsx'
import { SlideshowScreen } from '@/components/frame/SlideshowScreen.tsx'
import { useFrameSelection } from '@/hooks/useFrameSelection.ts'
import { useIdle } from '@/hooks/useIdle.ts'
import { useOnIdle } from '@/hooks/useOnIdle.ts'
import { usePhotoFeed } from '@/hooks/usePhotoFeed.ts'
import { useSlideshowSettings } from '@/hooks/useSlideshowSettings.ts'
import { cn } from '@/lib/utils.ts'

// The frame is a screen on a wall: dark keeps the photos in front.
const FRAME_CLASSES = 'dark min-h-svh bg-frame-background text-foreground'
// The controls step aside quickly: the photo is what the wall is for.
const CONTROLS_HIDE_DELAY_MS = 4000
// Long enough to browse the library; after it, the wall goes back to showing photos.
const LIBRARY_IDLE_DELAY_MS = 60_000

function EmptyFrame(): JSX.Element {
  return (
    <main
      className={cn(
        FRAME_CLASSES,
        'grid place-items-center bg-radial from-frame-accent/10 to-transparent to-70%',
      )}
    >
      <div className="flex flex-col items-center gap-4 px-6 text-center">
        <ImagesIcon
          aria-hidden
          className="size-16 text-frame-accent/80 motion-safe:animate-pulse"
        />
        <p className="text-3xl font-medium">En attente de la première photo…</p>
        {/* A first visitor needs the way in, not only the news that the frame is empty. */}
        <p className="text-lg text-muted-foreground">
          Envoyez-en une depuis votre téléphone : {window.location.host}
        </p>
      </div>
    </main>
  )
}

export default function FramePage(): JSX.Element {
  const photos = usePhotoFeed()
  const isActive = useIdle(CONTROLS_HIDE_DELAY_MS)
  const isLibraryActive = useIdle(LIBRARY_IDLE_DELAY_MS)
  const selection = useFrameSelection(photos, isActive)
  const settings = useSlideshowSettings()

  function startSlideshow(): void {
    selection.startSlideshow()
    settings.onPlayingChange(true)
  }

  function openPhoto(id: string): void {
    selection.openPhoto(id)
    // A photo picked by hand is there to be looked at, not to slide away.
    settings.onPlayingChange(false)
  }

  // The wall never shows a still grid: an unattended library turns into the slideshow.
  useOnIdle(isLibraryActive, () => {
    if (selection.mode === 'library') startSlideshow()
  })

  const currentPhoto = photos.find(({ id }) => id === selection.currentId)
  if (currentPhoto === undefined) return <EmptyFrame />

  const isSlideshow = selection.mode === 'slideshow'
  return (
    <main className={cn(FRAME_CLASSES, isSlideshow && !isActive && 'cursor-none')}>
      {isSlideshow ? (
        <SlideshowScreen
          photos={photos}
          currentPhoto={currentPhoto}
          selection={selection}
          isActive={isActive}
          settings={settings}
        />
      ) : (
        <LibraryScreen
          photos={photos}
          currentId={currentPhoto.id}
          onOpenPhoto={openPhoto}
          onStartSlideshow={startSlideshow}
        />
      )}
    </main>
  )
}
