import type { JSX } from 'react'
import { CloseButton } from '@/components/frame/CloseButton.tsx'
import { FrameControls } from '@/components/frame/FrameControls.tsx'
import { NewPhotosBadge } from '@/components/frame/NewPhotosBadge.tsx'
import { PhotoControls } from '@/components/frame/PhotoControls.tsx'
import { PhotoView } from '@/components/frame/PhotoView.tsx'
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
      <PhotoView
        photos={photos}
        currentId={currentPhoto.id}
        isStripVisible={settings.isStripVisible}
        // The slideshow waits while someone is using the frame.
        autoAdvanceMs={settings.isPlaying && !isActive ? settings.intervalMs : null}
        onCurrentChange={selection.selectPhoto}
      />
      <FrameControls isVisible={isActive}>
        <CloseButton onClose={selection.closeSlideshow} />
        <PhotoControls
          photo={currentPhoto}
          isStripVisible={settings.isStripVisible}
          onStripVisibleChange={settings.onStripVisibleChange}
          slideshow={settings}
        />
      </FrameControls>
      <NewPhotosBadge count={selection.newPhotoCount} onSelect={selection.showNewest} />
    </>
  )
}
