import { useState } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import { type FrameSettingsControls, useFrameSettings } from '@/hooks/useFrameSettings.ts'
import type { PlayedSource } from '@/photoSource.ts'
import { RADIO_PARAM } from '@/viewerHistory.ts'

// Pause and the strip are for whoever stands in front of the frame: they are not remembered.
// source: a radio while /frame?radio=<id> plays one, else the stored choice.
export type SlideshowSettings = Omit<FrameSettingsControls, 'source'> & {
  source: PlayedSource
  isPlaying: boolean
  isStripVisible: boolean
  onPlayingChange: (isPlaying: boolean) => void
  onStripVisibleChange: (isStripVisible: boolean) => void
}

type RadioParam = { radioPhotoId: string | null; stopRadio: () => void }

// Replace, keeping the entry's state: leaving the frame still goes back to what was below it.
function useRadioParam(): RadioParam {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const radioPhotoId = searchParams.get(RADIO_PARAM)

  function stopRadio(): void {
    if (radioPhotoId === null) return
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete(RADIO_PARAM)
    setSearchParams(nextParams, { replace: true, state: location.state })
  }

  return { radioPhotoId, stopRadio }
}

// Called by the page, not the slideshow screen: the page's photo selection reads isPlaying too.
// Choosing photos in the menu ends the radio: the choice is stored, and plays at once.
export function useSlideshowSettings(): SlideshowSettings {
  const frameSettings = useFrameSettings()
  const { radioPhotoId, stopRadio } = useRadioParam()
  const [isPlaying, setIsPlaying] = useState(true)
  const [isStripVisible, setIsStripVisible] = useState(false)

  return {
    ...frameSettings,
    source: radioPhotoId === null ? frameSettings.source : { kind: 'radio', photoId: radioPhotoId },
    onSourceChange: (source) => {
      frameSettings.onSourceChange(source)
      stopRadio()
    },
    isPlaying,
    isStripVisible,
    onPlayingChange: setIsPlaying,
    onStripVisibleChange: setIsStripVisible,
  }
}
