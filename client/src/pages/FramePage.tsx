import type { JSX } from 'react'
import { FrameNotices } from '@/components/frame/FrameNotices.tsx'
import { type FrameStatus, FrameStatusScreen } from '@/components/frame/FrameStatusScreen.tsx'
import { SlideshowScreen } from '@/components/frame/SlideshowScreen.tsx'
import { MailRevealDialog } from '@/components/mail/MailRevealDialog.tsx'
import { type FrameMode, useFrameMode } from '@/hooks/useFrameMode.ts'
import { useMailReveal } from '@/hooks/useMailReveal.ts'
import type { FeedStatus } from '@/hooks/usePhotoFeed.ts'
import { usePhotoMail } from '@/hooks/usePhotoMail.ts'
import { cn } from '@/lib/utils.ts'

// The frame is a screen on a wall: dark keeps the photos in front.
const FRAME_CLASSES = 'dark min-h-svh bg-frame-background text-foreground'

type FrameScreenProps = {
  frame: FrameMode
  hasWaitingPhotos: boolean
}

// Reached only without photos: once loaded, that means an empty library, maybe with mail.
function frameStatus(status: FeedStatus, hasWaitingPhotos: boolean): FrameStatus {
  if (status !== 'loaded') return status
  return hasWaitingPhotos ? 'unopened' : 'empty'
}

function FrameScreen({ frame, hasWaitingPhotos }: FrameScreenProps): JSX.Element {
  if (frame.currentPhoto === undefined) {
    return (
      <FrameStatusScreen
        status={frameStatus(frame.status, hasWaitingPhotos)}
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

export default function FramePage(): JSX.Element {
  const frame = useFrameMode()
  const mail = usePhotoMail()
  const reveal = useMailReveal()

  // The photos just opened joined the slideshow while the reveal was open: they were seen,
  // no pill should announce them again.
  function closeReveal(): void {
    reveal.close()
    frame.selection.showNewest()
  }

  return (
    <>
      <FrameScreen frame={frame} hasWaitingPhotos={mail.photos.length > 0} />
      <FrameNotices
        waitingCount={mail.photos.length}
        newPhotoCount={frame.selection.newPhotoCount}
        onReveal={() => reveal.start(mail.photos)}
        onShowNewest={frame.selection.showNewest}
      />
      {reveal.photos !== null && (
        <MailRevealDialog photos={reveal.photos} onOpen={mail.open} onClose={closeReveal} />
      )}
    </>
  )
}
