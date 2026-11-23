import { type JSX, useState } from 'react'
import { ContactSheet } from '@/components/frame/ContactSheet.tsx'
import { FrameControls, type FrameView } from '@/components/frame/FrameControls.tsx'
import { PhotoView } from '@/components/frame/PhotoView.tsx'
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
  const [view, setView] = useState<FrameView>('photo')
  // null follows the newest photo.
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isStripVisible, setIsStripVisible] = useState(false)

  const newestId = photos.at(0)?.id
  if (newestId === undefined) return <EmptyFrame />

  function selectPhoto(id: string): void {
    setSelectedId(id === newestId ? null : id)
  }

  function openPhoto(id: string): void {
    selectPhoto(id)
    setView('photo')
  }

  return (
    <main className={cn(FRAME_CLASSES, !isActive && 'cursor-none')}>
      {view === 'photo' ? (
        <PhotoView
          photos={photos}
          currentId={selectedId ?? newestId}
          isStripVisible={isStripVisible}
          onCurrentChange={selectPhoto}
        />
      ) : (
        <ContactSheet photos={photos} onSelect={openPhoto} />
      )}
      {isActive && (
        <FrameControls
          view={view}
          isStripVisible={isStripVisible}
          onViewChange={setView}
          onStripVisibleChange={setIsStripVisible}
        />
      )}
    </main>
  )
}
