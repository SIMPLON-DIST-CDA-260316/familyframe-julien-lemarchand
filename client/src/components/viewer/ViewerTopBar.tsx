import { InfoIcon, PlayIcon, XIcon } from 'lucide-react'
import type { JSX } from 'react'
import { PhotoActionsMenu } from '@/components/frame/PhotoActionsMenu.tsx'
import { Button } from '@/components/ui/button.tsx'
import { PHOTO_INFO_ID } from '@/components/viewer/PhotoInfo.tsx'
import { SharePhotoItem } from '@/components/viewer/SharePhotoItem.tsx'
import { chromeClasses, VIEWER_BUTTON_CLASSES } from '@/components/viewer/viewerClasses.ts'
import { cn } from '@/lib/utils.ts'
import type { Photo } from '@/photo.ts'

type ViewerTopBarProps = {
  photo: Photo
  isVisible: boolean
  counter: string
  isInfoOpen: boolean
  onClose: () => void
  onStartFrame: () => void
  onToggleInfo: () => void
}

function InfoButton({
  isInfoOpen,
  onToggleInfo,
}: Pick<ViewerTopBarProps, 'isInfoOpen' | 'onToggleInfo'>): JSX.Element {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={onToggleInfo}
      aria-label="Infos"
      aria-expanded={isInfoOpen}
      aria-controls={isInfoOpen ? PHOTO_INFO_ID : undefined}
      className={VIEWER_BUTTON_CLASSES}
    >
      <InfoIcon />
    </Button>
  )
}

function StartFrameButton({ onStartFrame }: Pick<ViewerTopBarProps, 'onStartFrame'>): JSX.Element {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onStartFrame}
      // The glass, but a pill wide enough for its label.
      className={cn(VIEWER_BUTTON_CLASSES, 'w-auto px-3')}
    >
      <PlayIcon data-icon="inline-start" />
      Mode cadre
    </Button>
  )
}

function CloseViewerButton({ onClose }: Pick<ViewerTopBarProps, 'onClose'>): JSX.Element {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={onClose}
      aria-label="Fermer la photo"
      className={VIEWER_BUTTON_CLASSES}
    >
      <XIcon />
    </Button>
  )
}

export function ViewerTopBar({
  photo,
  isVisible,
  counter,
  isInfoOpen,
  onClose,
  onStartFrame,
  onToggleInfo,
}: ViewerTopBarProps): JSX.Element {
  return (
    // ✕ top left and the actions top right, as on the slideshow. The row spans the screen: only
    // its buttons take pointers, swipes beside them reach the carousel. Its shade runs under the
    // notch, its buttons stay below it. Hidden, inert keeps its buttons out of focus and clicks.
    <div
      data-viewer-controls
      inert={!isVisible}
      className={cn(
        'pointer-events-none absolute inset-x-0 top-0 flex items-center gap-2 bg-linear-to-b from-black/60 to-transparent pt-[max(0.75rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-3 pl-[max(1rem,env(safe-area-inset-left))]',
        isVisible && '*:pointer-events-auto',
        chromeClasses(isVisible),
      )}
    >
      <CloseViewerButton onClose={onClose} />
      {/* Announced by PhotoViewer instead: the hidden bar is inert, out of screen readers' reach. */}
      <p aria-hidden className="mx-auto text-sm text-white/80 tabular-nums">
        {counter}
      </p>
      <InfoButton isInfoOpen={isInfoOpen} onToggleInfo={onToggleInfo} />
      <StartFrameButton onStartFrame={onStartFrame} />
      <PhotoActionsMenu
        photo={photo}
        label="Actions sur la photo"
        className={VIEWER_BUTTON_CLASSES}
      >
        <SharePhotoItem photo={photo} />
      </PhotoActionsMenu>
    </div>
  )
}
