import { LayoutGridIcon, ListIcon } from 'lucide-react'
import type { JSX } from 'react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx'
import { isLibraryLayout, type LibraryLayout } from '@/hooks/useLibraryLayout.ts'

type LayoutToggleProps = {
  layout: LibraryLayout
  onLayoutChange: (layout: LibraryLayout) => void
}

export function LayoutToggle({ layout, onLayoutChange }: LayoutToggleProps): JSX.Element {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="lg"
      spacing={0}
      // Each item 44 px under a finger, the size touch guidelines ask for.
      className="*:pointer-coarse:size-11"
      value={layout}
      // Radix sends '' when the pressed item is clicked again: keep the current layout.
      onValueChange={(value) => {
        if (isLibraryLayout(value)) onLayoutChange(value)
      }}
      aria-label="Affichage des photos"
    >
      <ToggleGroupItem value="grid" aria-label="Miniatures" title="Miniatures">
        <LayoutGridIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="list" aria-label="Liste" title="Liste">
        <ListIcon />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
