import { type JSX, useState } from 'react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx'
import { isPalette, type Palette, readPalette, savePalette } from '@/palette.ts'

type PaletteOption = { value: Palette; label: string }

const PALETTE_OPTIONS: PaletteOption[] = [
  { value: 'encre', label: 'Encre' },
  { value: 'actuelle', label: 'Actuelle' },
]

// The muted pressed background barely shows on the dark menu: the chosen item is inverted.
const SELECTED_ITEM_CLASSES =
  'data-[state=on]:bg-foreground data-[state=on]:text-background data-[state=on]:hover:bg-foreground/90'

// Under the theme toggle, in the avatar menu: the palette and the theme combine freely.
export function PaletteToggle(): JSX.Element {
  const [palette, setPalette] = useState(readPalette)

  return (
    <div className="flex items-center justify-between gap-3 px-2 py-1.5">
      <span className="text-sm">Palette</span>
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        spacing={0}
        value={palette}
        // Radix sends '' when the pressed item is clicked again: keep the current palette.
        onValueChange={(value) => {
          if (!isPalette(value)) return
          savePalette(value)
          setPalette(value)
        }}
        aria-label="Palette"
      >
        {PALETTE_OPTIONS.map(({ value, label }) => (
          <ToggleGroupItem key={value} value={value} className={`px-2.5 ${SELECTED_ITEM_CLASSES}`}>
            {label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}
