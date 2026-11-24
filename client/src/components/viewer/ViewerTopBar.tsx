import { XIcon } from 'lucide-react'
import type { JSX } from 'react'
import { PhotoActionsMenu } from '@/components/frame/PhotoActionsMenu.tsx'
import { Button } from '@/components/ui/button.tsx'
import { VIEWER_BUTTON_CLASSES } from '@/components/viewer/viewerClasses.ts'
import type { Photo } from '@/photo.ts'

type ViewerTopBarProps = {
  photo: Photo
  counter: string
  onClose: () => void
}

export function ViewerTopBar({ photo, counter, onClose }: ViewerTopBarProps): JSX.Element {
  return (
    // ✕ top left and the actions top right, as on the slideshow. The row spans the screen: only
    // its buttons take pointers, swipes beside them reach the carousel.
    <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center gap-2 bg-linear-to-b from-black/60 to-transparent px-4 py-3 *:pointer-events-auto">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onClose}
        aria-label="Fermer la photo"
        className={VIEWER_BUTTON_CLASSES}
      >
        <XIcon />
      </Button>
      <p aria-live="polite" className="mx-auto text-sm text-white/80 tabular-nums">
        {counter}
      </p>
      <PhotoActionsMenu
        photo={photo}
        label="Actions sur la photo"
        className={VIEWER_BUTTON_CLASSES}
      />
    </div>
  )
}
