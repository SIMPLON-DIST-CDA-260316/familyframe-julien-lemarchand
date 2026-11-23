import { PauseIcon, PlayIcon } from 'lucide-react'
import type { JSX } from 'react'
import { ControlsDivider } from '@/components/frame/ControlsDivider.tsx'
import { PILL_TOGGLE_CLASSES } from '@/components/frame/pillToggleClasses.ts'
import { Toggle } from '@/components/ui/toggle.tsx'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx'
import { SLIDESHOW_INTERVALS_MS } from '@/hooks/useSlideshow.ts'

const MS_PER_SECOND = 1000

type SlideshowControlsProps = {
  isPlaying: boolean
  intervalMs: number
  onPlayingChange: (isPlaying: boolean) => void
  onIntervalChange: (intervalMs: number) => void
}

export function SlideshowControls({
  isPlaying,
  intervalMs,
  onPlayingChange,
  onIntervalChange,
}: SlideshowControlsProps): JSX.Element {
  return (
    <>
      <Toggle
        pressed={isPlaying}
        onPressedChange={onPlayingChange}
        aria-label="Diaporama"
        className={PILL_TOGGLE_CLASSES}
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </Toggle>
      <ControlsDivider />
      <ToggleGroup
        type="single"
        value={String(intervalMs)}
        // Radix sends '' when the pressed item is clicked again: keep the current pace.
        onValueChange={(value) => {
          const selectedMs = Number(value)
          if (SLIDESHOW_INTERVALS_MS.includes(selectedMs)) onIntervalChange(selectedMs)
        }}
        aria-label="Durée par photo"
      >
        {SLIDESHOW_INTERVALS_MS.map((interval) => (
          <ToggleGroupItem key={interval} value={String(interval)} className={PILL_TOGGLE_CLASSES}>
            {interval / MS_PER_SECOND} s
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </>
  )
}
