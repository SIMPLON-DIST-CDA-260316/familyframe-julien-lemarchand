import { useState } from 'react'
import { DEFAULT_SLIDESHOW_INTERVAL_MS } from '@/hooks/useSlideshow.ts'

export type SlideshowSettings = {
  isPlaying: boolean
  intervalMs: number
  isStripVisible: boolean
  onPlayingChange: (isPlaying: boolean) => void
  onIntervalChange: (intervalMs: number) => void
  onStripVisibleChange: (isStripVisible: boolean) => void
}

// Called by the page, not the slideshow screen: the screen unmounts in the library, and the
// chosen speed must survive the trip.
export function useSlideshowSettings(): SlideshowSettings {
  const [isPlaying, setIsPlaying] = useState(true)
  const [intervalMs, setIntervalMs] = useState(DEFAULT_SLIDESHOW_INTERVAL_MS)
  const [isStripVisible, setIsStripVisible] = useState(false)

  return {
    isPlaying,
    intervalMs,
    isStripVisible,
    onPlayingChange: setIsPlaying,
    onIntervalChange: setIntervalMs,
    onStripVisibleChange: setIsStripVisible,
  }
}
