import type { JSX } from 'react'
import { CloseButton } from '@/components/frame/CloseButton.tsx'
import { ControlsBar } from '@/components/frame/ControlsBar.tsx'
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
      className="fixed inset-x-0 top-0 z-10 justify-between"
    >
      <CloseButton onClose={onClose} />
      <SlideshowMenu
        photo={photo}
        intervalMs={settings.intervalMs}
        onIntervalChange={settings.onIntervalChange}
      />
    </ControlsBar>
  )
}
