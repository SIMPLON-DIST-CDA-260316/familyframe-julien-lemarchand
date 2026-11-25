import type { JSX } from 'react'
import { type FrameStatus, FrameStatusScreen } from '@/components/frame/FrameStatusScreen.tsx'
import { SlideshowScreen } from '@/components/frame/SlideshowScreen.tsx'
import { useFrameMode } from '@/hooks/useFrameMode.ts'
import type { FeedStatus } from '@/hooks/usePhotoFeed.ts'
import { cn } from '@/lib/utils.ts'

// The frame is a screen on a wall: dark keeps the photos in front.
const FRAME_CLASSES = 'dark min-h-svh bg-frame-background text-foreground'

// Reached only without photos: once loaded, that means an empty library.
function frameStatus(status: FeedStatus): FrameStatus {
  return status === 'loaded' ? 'empty' : status
}

export default function FramePage(): JSX.Element {
  const frame = useFrameMode()

  if (frame.currentPhoto === undefined) {
    return (
      <FrameStatusScreen
        status={frameStatus(frame.status)}
        className={FRAME_CLASSES}
        onLeave={frame.leave}
      />
    )
  }

  return (
    // data-idle: the slideshow's shade reads it from CSS, without one more prop down the tree.
    <main
      data-idle={!frame.isActive}
      className={cn('group/frame', FRAME_CLASSES, !frame.isActive && 'cursor-none')}
    >
      <SlideshowScreen
        photos={frame.photos}
        currentPhoto={frame.currentPhoto}
        selection={frame.selection}
        isActive={frame.isActive}
        settings={frame.settings}
        onClose={frame.leave}
      />
    </main>
  )
}
