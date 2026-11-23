import { GalleryHorizontalIcon } from 'lucide-react'
import type { JSX } from 'react'
import { PILL_TOGGLE_CLASSES } from '@/components/frame/pillToggleClasses.ts'
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
      className={PILL_TOGGLE_CLASSES}
    >
      <GalleryHorizontalIcon />
    </Toggle>
  )
}
