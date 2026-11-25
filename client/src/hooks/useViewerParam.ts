import { type NavigateOptions, useLocation, useNavigate, useSearchParams } from 'react-router'
import { enterFullscreen } from '@/fullscreen.ts'
import {
  isLibraryBelow,
  LIBRARY_BELOW_STATE,
  PHOTO_PARAM,
  photoPath,
  withPhotoParam,
} from '@/viewerHistory.ts'

export type ViewerParam = {
  openId: string | null
  open: (photoId: string) => void
  show: (photoId: string) => void
  close: () => void
  dismiss: () => void
  startFrame: (photoId: string) => void
}

// Replace, keeping the viewer's state: the frame takes the viewer's place above the library,
// so leaving the frame brings back one viewer, not two.
function useStartFrame(): (photoId: string) => void {
  const location = useLocation()
  const navigate = useNavigate()
  return (photoId) => {
    enterFullscreen()
    navigate(photoPath('/frame', photoId), { replace: true, state: location.state })
  }
}

// Only the photo param changes: the collection shown stays in the URL.
export function useViewerParam(): ViewerParam {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const startFrame = useStartFrame()
  const openId = searchParams.get(PHOTO_PARAM)

  function setPhotoParam(photoId: string | null, options: NavigateOptions): void {
    setSearchParams(withPhotoParam(searchParams, photoId), options)
  }

  function show(photoId: string): void {
    if (photoId === openId) return
    // Replace: swiping through twenty photos must not take twenty back presses to leave.
    setPhotoParam(photoId, { replace: true, state: location.state })
  }

  // Replace, never back: the viewer calls it from an effect that may run twice.
  function dismiss(): void {
    setPhotoParam(null, { replace: true })
  }

  function close(): void {
    if (isLibraryBelow(location.state)) navigate(-1)
    else dismiss()
  }

  const open = (photoId: string): void => setPhotoParam(photoId, { state: LIBRARY_BELOW_STATE })
  return { openId, open, show, close, dismiss, startFrame }
}
