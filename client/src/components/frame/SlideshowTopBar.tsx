import type { JSX } from 'react'
import { CloseButton } from '@/components/frame/CloseButton.tsx'
import { ControlsBar } from '@/components/frame/ControlsBar.tsx'
import { FullscreenButton } from '@/components/frame/FullscreenButton.tsx'
import { SlideshowMenu } from '@/components/frame/SlideshowMenu.tsx'
import type { SlideshowSettings } from '@/hooks/useSlideshowSettings.ts'
import type { Photo } from '@/photo.ts'

type SlideshowTopBarProps = {
  isVisible: boolean
  photo: Photo
  settings: SlideshowSettings
  onClose: () => void
}

export function SlideshowTopBar({
  isVisible,
  photo,
  settings,
  onClose,
}: SlideshowTopBarProps): JSX.Element {
  return (
    // ✕ top left, where photo viewers put it; the actions on the photo top right.
    <ControlsBar
      edge="top"
      isVisible={isVisible}
      // Clear of the notch, and of the rounded corners of a phone held sideways.
      className="fixed inset-x-0 top-0 z-10 justify-between pt-[max(1rem,env(safe-area-inset-top))] pr-[max(1.5rem,env(safe-area-inset-right))] pl-[max(1.5rem,env(safe-area-inset-left))]"
    >
      <CloseButton onClose={onClose} />
      <div className="flex items-center gap-2">
        <FullscreenButton />
        <SlideshowMenu photo={photo} settings={settings} />
      </div>
    </ControlsBar>
  )
}
