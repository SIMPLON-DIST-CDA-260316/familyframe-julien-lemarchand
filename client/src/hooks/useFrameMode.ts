import { useSearchParams } from 'react-router'
import { useFrameFullscreen } from '@/hooks/useFrameFullscreen.ts'
import { type FrameSelection, useFrameSelection } from '@/hooks/useFrameSelection.ts'
import { useIdle } from '@/hooks/useIdle.ts'
import { useLeaveFrame } from '@/hooks/useLeaveFrame.ts'
import { type FeedStatus, usePhotoFeed } from '@/hooks/usePhotoFeed.ts'
import { type SlideshowSettings, useSlideshowSettings } from '@/hooks/useSlideshowSettings.ts'
import type { Photo } from '@/photo.ts'
import { PHOTO_PARAM } from '@/viewerHistory.ts'

// The controls step aside quickly: the photo is what the wall is for.
const CONTROLS_HIDE_DELAY_MS = 4000

export type FrameMode = {
  photos: Photo[]
  status: FeedStatus
  // undefined while there is no photo to show.
  currentPhoto: Photo | undefined
  isActive: boolean
  settings: SlideshowSettings
  selection: FrameSelection
  leave: () => void
}

export function useFrameMode(): FrameMode {
  const { photos, status } = usePhotoFeed()
  const isActive = useIdle(CONTROLS_HIDE_DELAY_MS)
  const settings = useSlideshowSettings()
  const [searchParams] = useSearchParams()
  // A paused photo was chosen by someone: a new arrival raises the badge instead of replacing it.
  const selection = useFrameSelection(
    photos,
    isActive || !settings.isPlaying,
    searchParams.get(PHOTO_PARAM),
  )
  const leaveFrame = useLeaveFrame()
  const currentPhoto = photos.find(({ id }) => id === selection.currentId)
  const leave = (): void => leaveFrame(currentPhoto?.id ?? null)
  useFrameFullscreen(leave)

  return { photos, status, currentPhoto, isActive, settings, selection, leave }
}
