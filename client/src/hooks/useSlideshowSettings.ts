import { useState } from 'react'
import { type FrameSettingsControls, useFrameSettings } from '@/hooks/useFrameSettings.ts'

// Pause and the strip are for whoever stands in front of the frame: they are not remembered.
export type SlideshowSettings = FrameSettingsControls & {
  isPlaying: boolean
  isStripVisible: boolean
  onPlayingChange: (isPlaying: boolean) => void
  onStripVisibleChange: (isStripVisible: boolean) => void
}

// Called by the page, not the slideshow screen: the page's photo selection reads isPlaying too.
export function useSlideshowSettings(): SlideshowSettings {
  const frameSettings = useFrameSettings()
  const [isPlaying, setIsPlaying] = useState(true)
  const [isStripVisible, setIsStripVisible] = useState(false)

  return {
    ...frameSettings,
    isPlaying,
    isStripVisible,
    onPlayingChange: setIsPlaying,
    onStripVisibleChange: setIsStripVisible,
  }
}
