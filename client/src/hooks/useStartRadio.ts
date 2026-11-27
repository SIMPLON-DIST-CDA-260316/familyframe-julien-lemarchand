import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { enterFullscreen } from '@/fullscreen.ts'
import { LIBRARY_BELOW_STATE, PHOTO_PARAM, radioPath } from '@/viewerHistory.ts'

// Opens the frame on the radio of a photo, in full screen: called in the click itself, the only
// moment the browser grants it.
export function useStartRadio(): (photoId: string) => void {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  return (photoId) => {
    enterFullscreen()
    // From the frame or the viewer, the radio takes their entry's place, keeping its state:
    // leaving the frame brings back one viewer, not two. From the library, it goes on top.
    if (location.pathname === '/frame' || searchParams.has(PHOTO_PARAM)) {
      navigate(radioPath(photoId), { replace: true, state: location.state })
      return
    }
    navigate(radioPath(photoId), { state: LIBRARY_BELOW_STATE })
  }
}
