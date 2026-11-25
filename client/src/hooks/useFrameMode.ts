import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { useFrameFullscreen } from '@/hooks/useFrameFullscreen.ts'
import { type FrameSelection, useFrameSelection } from '@/hooks/useFrameSelection.ts'
import { useIdle } from '@/hooks/useIdle.ts'
import { useLeaveFrame } from '@/hooks/useLeaveFrame.ts'
import { type FeedStatus, usePhotoFeed } from '@/hooks/usePhotoFeed.ts'
import { usePlaybackPhotos } from '@/hooks/usePlaybackPhotos.ts'
import { type SlideshowSettings, useSlideshowSettings } from '@/hooks/useSlideshowSettings.ts'
import { type SourcePhotos, useSourcePhotos } from '@/hooks/useSourcePhotos.ts'
import type { Photo } from '@/photo.ts'
import { type PhotoSource, sourceKey } from '@/photoSource.ts'
import { PHOTO_PARAM } from '@/viewerHistory.ts'

// The controls step aside quickly: the photo is what the wall is for.
const CONTROLS_HIDE_DELAY_MS = 4000

export type FrameMode = {
  // In the order they play.
  photos: Photo[]
  status: FeedStatus
  // The source played: the library when the chosen one is unavailable.
  source: PhotoSource
  // undefined while there is no photo to show.
  currentPhoto: Photo | undefined
  isActive: boolean
  settings: SlideshowSettings
  selection: FrameSelection
  leave: () => void
}

// A new source starts on its newest photo: the photo picked and the count of arrivals belonged to
// the previous one. Adjusted during render, like the selection itself. Returns the photo to play
// now: the newest already, so the shuffle draws its new round from it, not from the old photo.
// The first source known after loading is no change: /frame?photo=<id> keeps its photo.
function useRestartOnSourceChange(
  { photos, status, source }: SourcePhotos,
  selection: FrameSelection,
): string | undefined {
  const key = status === 'loading' ? null : sourceKey(source)
  const [shownKey, setShownKey] = useState(key)
  if (key === null || key === shownKey) return selection.currentId
  setShownKey(key)
  if (shownKey === null) return selection.currentId
  selection.showNewest()
  return photos.at(0)?.id
}

export function useFrameMode(): FrameMode {
  const settings = useSlideshowSettings()
  const sourcePhotos = useSourcePhotos(usePhotoFeed(), settings.source)
  const { photos, status, source } = sourcePhotos
  const isActive = useIdle(CONTROLS_HIDE_DELAY_MS)
  const [searchParams] = useSearchParams()
  // A paused photo was chosen by someone: a new arrival raises the badge instead of replacing it.
  const selection = useFrameSelection(
    photos,
    isActive || !settings.isPlaying,
    searchParams.get(PHOTO_PARAM),
  )
  const currentId = useRestartOnSourceChange(sourcePhotos, selection)
  const leaveFrame = useLeaveFrame()
  const currentPhoto = photos.find(({ id }) => id === currentId)
  const leave = (): void => leaveFrame(currentPhoto?.id ?? null)
  useFrameFullscreen(leave)
  const playbackPhotos = usePlaybackPhotos(photos, settings.order, currentId, sourceKey(source))

  return {
    photos: playbackPhotos,
    status,
    source,
    currentPhoto,
    isActive,
    settings,
    selection,
    leave,
  }
}
