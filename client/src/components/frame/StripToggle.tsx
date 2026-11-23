import { GalleryHorizontalIcon } from 'lucide-react'
import type { JSX } from 'react'
import { GLASS_BUTTON_CLASSES } from '@/components/frame/controlClasses.ts'
import { Toggle } from '@/components/ui/toggle.tsx'

type StripToggleProps = {
  isStripVisible: boolean
  onStripVisibleChange: (isVisible: boolean) => void
}

export function StripToggle({
  isStripVisible,
  onStripVisibleChange,
}: StripToggleProps): JSX.Element {
  return (
    <Toggle
      pressed={isStripVisible}
      onPressedChange={onStripVisibleChange}
      aria-label="Bandeau de vignettes"
      // An icon alone is a riddle: the tooltip names it.
      title="Vignettes"
      className={GLASS_BUTTON_CLASSES}
    >
      <GalleryHorizontalIcon />
    </Toggle>
  )
}
