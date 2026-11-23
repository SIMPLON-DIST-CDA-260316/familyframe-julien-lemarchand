import { GalleryHorizontalIcon, ImageIcon, LayoutGridIcon } from 'lucide-react'
import type { JSX } from 'react'
import { Toggle } from '@/components/ui/toggle.tsx'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx'

export type FrameView = 'photo' | 'contact-sheet'

function isFrameView(value: string): value is FrameView {
  return value === 'photo' || value === 'contact-sheet'
}

type ViewTogglesProps = {
  view: FrameView
  isStripVisible: boolean
  onViewChange: (view: FrameView) => void
  onStripVisibleChange: (isVisible: boolean) => void
}

export function ViewToggles({
  view,
  isStripVisible,
  onViewChange,
  onStripVisibleChange,
}: ViewTogglesProps): JSX.Element {
  return (
    <>
      <ToggleGroup
        type="single"
        variant="outline"
        value={view}
        // Radix sends '' when the pressed item is clicked again: keep the current view.
        onValueChange={(value) => {
          if (isFrameView(value)) onViewChange(value)
        }}
        aria-label="Affichage"
      >
        <ToggleGroupItem value="photo">
          <ImageIcon /> Photo
        </ToggleGroupItem>
        <ToggleGroupItem value="contact-sheet">
          <LayoutGridIcon /> Pellicule
        </ToggleGroupItem>
      </ToggleGroup>
      {view === 'photo' && (
        <Toggle
          variant="outline"
          pressed={isStripVisible}
          onPressedChange={onStripVisibleChange}
          aria-label="Bandeau de vignettes"
        >
          <GalleryHorizontalIcon />
        </Toggle>
      )}
    </>
  )
}
