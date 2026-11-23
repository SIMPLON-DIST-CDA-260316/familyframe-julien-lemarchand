import { ImagesIcon } from 'lucide-react'
import { type JSX, useState } from 'react'
import { FrameControls } from '@/components/frame/FrameControls.tsx'
import { NewPhotosBadge } from '@/components/frame/NewPhotosBadge.tsx'
import { PhotoControls } from '@/components/frame/PhotoControls.tsx'
import { PhotoGrid } from '@/components/frame/PhotoGrid.tsx'
import { PhotoView } from '@/components/frame/PhotoView.tsx'
import { ViewToggles } from '@/components/frame/ViewToggles.tsx'
import { useFrameSelection } from '@/hooks/useFrameSelection.ts'
import { useIdle } from '@/hooks/useIdle.ts'
import { usePhotoFeed } from '@/hooks/usePhotoFeed.ts'
import { DEFAULT_SLIDESHOW_INTERVAL_MS } from '@/hooks/useSlideshow.ts'
import { cn } from '@/lib/utils.ts'

// The frame is a screen on a wall: dark keeps the photos in front.
const FRAME_CLASSES = 'dark min-h-svh bg-frame-background text-foreground'
// The controls step aside quickly: the photo is what the wall is for.
const CONTROLS_HIDE_DELAY_MS = 4000

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
  const selection = useFrameSelection(photos, isActive)
  const [isStripVisible, setIsStripVisible] = useState(false)
  const [isPlaying, setIsPlaying] = useState(true)
  const [intervalMs, setIntervalMs] = useState(DEFAULT_SLIDESHOW_INTERVAL_MS)

  const currentPhoto = photos.find(({ id }) => id === selection.currentId)
  if (currentPhoto === undefined) return <EmptyFrame />

  return (
    <main className={cn(FRAME_CLASSES, !isActive && 'cursor-none')}>
      {selection.view === 'photo' ? (
        <PhotoView
          photos={photos}
          currentId={currentPhoto.id}
          isStripVisible={isStripVisible}
          // The slideshow waits while someone is using the frame.
          autoAdvanceMs={isPlaying && !isActive ? intervalMs : null}
          onCurrentChange={selection.selectPhoto}
        />
      ) : (
        <PhotoGrid photos={photos} currentId={currentPhoto.id} onSelect={selection.openPhoto} />
      )}
      <FrameControls isVisible={isActive}>
        <ViewToggles view={selection.view} onViewChange={selection.setView} />
        {selection.view === 'photo' && (
          <PhotoControls
            photo={currentPhoto}
            isStripVisible={isStripVisible}
            onStripVisibleChange={setIsStripVisible}
            slideshow={{
              isPlaying,
              intervalMs,
              onPlayingChange: setIsPlaying,
              onIntervalChange: setIntervalMs,
            }}
          />
        )}
      </FrameControls>
      <NewPhotosBadge count={selection.newPhotoCount} onSelect={selection.showNewest} />
    </main>
  )
}
