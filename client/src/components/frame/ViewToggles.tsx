import { ImageIcon, LayoutGridIcon } from 'lucide-react'
import type { JSX } from 'react'
import { PILL_TOGGLE_CLASSES } from '@/components/frame/pillToggleClasses.ts'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx'

export type FrameView = 'photo' | 'contact-sheet'

function isFrameView(value: string): value is FrameView {
  return value === 'photo' || value === 'contact-sheet'
}

type ViewTogglesProps = {
  view: FrameView
  onViewChange: (view: FrameView) => void
}

export function ViewToggles({ view, onViewChange }: ViewTogglesProps): JSX.Element {
  return (
    <ToggleGroup
      type="single"
      value={view}
      // Radix sends '' when the pressed item is clicked again: keep the current view.
      onValueChange={(value) => {
        if (isFrameView(value)) onViewChange(value)
      }}
      aria-label="Affichage"
    >
      <ToggleGroupItem value="photo" className={PILL_TOGGLE_CLASSES}>
        <ImageIcon /> Photo
      </ToggleGroupItem>
      <ToggleGroupItem value="contact-sheet" className={PILL_TOGGLE_CLASSES}>
        <LayoutGridIcon /> Pellicule
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
