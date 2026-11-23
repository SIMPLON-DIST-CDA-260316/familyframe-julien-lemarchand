import { PauseIcon, PlayIcon } from 'lucide-react'
import type { JSX } from 'react'
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
        variant="outline"
        pressed={isPlaying}
        onPressedChange={onPlayingChange}
        aria-label="Diaporama"
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </Toggle>
      <ToggleGroup
        type="single"
        variant="outline"
        value={String(intervalMs)}
        // Radix sends '' when the pressed item is clicked again: keep the current pace.
        onValueChange={(value) => {
          const selectedMs = Number(value)
          if (SLIDESHOW_INTERVALS_MS.includes(selectedMs)) onIntervalChange(selectedMs)
        }}
        aria-label="Durée par photo"
      >
        {SLIDESHOW_INTERVALS_MS.map((interval) => (
          <ToggleGroupItem key={interval} value={String(interval)}>
            {interval / MS_PER_SECOND} s
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </>
  )
}
