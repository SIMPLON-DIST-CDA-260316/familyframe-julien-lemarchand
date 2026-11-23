import { type JSX, useState } from 'react'
import { ContactSheet } from '@/components/frame/ContactSheet.tsx'
import { FrameControls } from '@/components/frame/FrameControls.tsx'
import { NewPhotosBadge } from '@/components/frame/NewPhotosBadge.tsx'
import { PhotoView } from '@/components/frame/PhotoView.tsx'
import { ViewToggles } from '@/components/frame/ViewToggles.tsx'
import { useFrameSelection } from '@/hooks/useFrameSelection.ts'
import { useIdleControls } from '@/hooks/useIdleControls.ts'
import { usePhotoFeed } from '@/hooks/usePhotoFeed.ts'
import { cn } from '@/lib/utils.ts'

// The frame is a screen on a wall: dark keeps the photos in front.
const FRAME_CLASSES = 'dark min-h-svh bg-background text-foreground'

function EmptyFrame(): JSX.Element {
  return (
    <main className={FRAME_CLASSES}>
      <p className="pt-[40vh] text-center text-muted-foreground">
        En attente de la première photo…
      </p>
    </main>
  )
}

export default function FramePage(): JSX.Element {
  const photos = usePhotoFeed()
  const isActive = useIdleControls()
  const selection = useFrameSelection(photos, isActive)
  const [isStripVisible, setIsStripVisible] = useState(false)

  if (selection.currentId === undefined) return <EmptyFrame />

  return (
    <main className={cn(FRAME_CLASSES, !isActive && 'cursor-none')}>
      {selection.view === 'photo' ? (
        <PhotoView
          photos={photos}
          currentId={selection.currentId}
          isStripVisible={isStripVisible}
          onCurrentChange={selection.selectPhoto}
        />
      ) : (
        <ContactSheet photos={photos} onSelect={selection.openPhoto} />
      )}
      <FrameControls isVisible={isActive}>
        <ViewToggles
          view={selection.view}
          isStripVisible={isStripVisible}
          onViewChange={selection.setView}
          onStripVisibleChange={setIsStripVisible}
        />
      </FrameControls>
      {selection.newPhotoCount > 0 && (
        <NewPhotosBadge count={selection.newPhotoCount} onSelect={selection.showNewest} />
      )}
    </main>
  )
}
