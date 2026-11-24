import type { JSX } from 'react'
import { useSearchParams } from 'react-router'
import { type FrameStatus, FrameStatusScreen } from '@/components/frame/FrameStatusScreen.tsx'
import { SlideshowScreen } from '@/components/frame/SlideshowScreen.tsx'
import { useFrameSelection } from '@/hooks/useFrameSelection.ts'
import { useIdle } from '@/hooks/useIdle.ts'
import { useLeaveFrame } from '@/hooks/useLeaveFrame.ts'
import { type FeedStatus, usePhotoFeed } from '@/hooks/usePhotoFeed.ts'
import { useSlideshowSettings } from '@/hooks/useSlideshowSettings.ts'
import { cn } from '@/lib/utils.ts'
import { PHOTO_PARAM } from '@/viewerHistory.ts'

// The frame is a screen on a wall: dark keeps the photos in front.
const FRAME_CLASSES = 'dark min-h-svh bg-frame-background text-foreground'
// The controls step aside quickly: the photo is what the wall is for.
const CONTROLS_HIDE_DELAY_MS = 4000

// Reached only without photos: once loaded, that means an empty library.
function frameStatus(status: FeedStatus): FrameStatus {
  return status === 'loaded' ? 'empty' : status
}

export default function FramePage(): JSX.Element {
  const { photos, status } = usePhotoFeed()
  const isActive = useIdle(CONTROLS_HIDE_DELAY_MS)
  const settings = useSlideshowSettings()
  const [searchParams] = useSearchParams()
  // A paused photo was chosen by someone: a new arrival raises the badge instead of replacing it.
  const selection = useFrameSelection(
    photos,
    isActive || !settings.isPlaying,
    searchParams.get(PHOTO_PARAM),
  )
  const leaveFrame = useLeaveFrame()

  const currentPhoto = photos.find(({ id }) => id === selection.currentId)
  if (currentPhoto === undefined) {
    return (
      <FrameStatusScreen
        status={frameStatus(status)}
        className={FRAME_CLASSES}
        onLeave={() => leaveFrame(null)}
      />
    )
  }

  return (
    // data-idle: the slideshow's shade reads it from CSS, without one more prop down the tree.
    <main
      data-idle={!isActive}
      className={cn('group/frame', FRAME_CLASSES, !isActive && 'cursor-none')}
    >
      <SlideshowScreen
        photos={photos}
        currentPhoto={currentPhoto}
        selection={selection}
        isActive={isActive}
        settings={settings}
        onClose={() => leaveFrame(currentPhoto.id)}
      />
    </main>
  )
}
