import type { JSX } from 'react'
import { NewPhotosBadge } from '@/components/frame/NewPhotosBadge.tsx'
import { PhotoStrip } from '@/components/frame/PhotoStrip.tsx'
import { PhotoView } from '@/components/frame/PhotoView.tsx'
import { SlideshowBottomBar } from '@/components/frame/SlideshowBottomBar.tsx'
import { SlideshowTopBar } from '@/components/frame/SlideshowTopBar.tsx'
import { useEscapeToClose } from '@/hooks/useEscapeToClose.ts'
import type { FrameSelection } from '@/hooks/useFrameSelection.ts'
import type { SlideshowSettings } from '@/hooks/useSlideshowSettings.ts'
import type { Photo } from '@/photo.ts'

type SlideshowScreenProps = {
  photos: Photo[]
  currentPhoto: Photo
  selection: FrameSelection
  isActive: boolean
  settings: SlideshowSettings
}

export function SlideshowScreen({
  photos,
  currentPhoto,
  selection,
  isActive,
  settings,
}: SlideshowScreenProps): JSX.Element {
  useEscapeToClose(selection.closeSlideshow)

  return (
    <>
      {/* First in the DOM: Tab reaches ✕ and ⋯ before the transport. */}
      <SlideshowTopBar
        isVisible={isActive}
        photo={currentPhoto}
        settings={settings}
        onClose={selection.closeSlideshow}
      />
      <PhotoView
        photos={photos}
        currentId={currentPhoto.id}
        // The slideshow waits while someone is using the frame.
        autoAdvanceMs={settings.isPlaying && !isActive ? settings.intervalMs : null}
        onCurrentChange={selection.selectPhoto}
      >
        <SlideshowBottomBar isVisible={isActive} settings={settings} />
        <PhotoStrip
          isVisible={settings.isStripVisible}
          photos={photos}
          currentId={currentPhoto.id}
          onSelect={selection.selectPhoto}
        />
      </PhotoView>
      <NewPhotosBadge count={selection.newPhotoCount} onSelect={selection.showNewest} />
    </>
  )
}
