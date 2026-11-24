import { useLocation, useNavigate } from 'react-router'
import { isLibraryBelow, LIBRARY_BELOW_STATE, photoPath } from '@/viewerHistory.ts'

// Leaving the frame opens the viewer on the photo that was on screen, or the library when the
// frame had no photo to show.
export function useLeaveFrame(): (photoId: string | null) => void {
  const navigate = useNavigate()
  const location = useLocation()

  return (photoId) => {
    if (photoId === null) {
      // Back to the library entry the frame was opened from, rather than one more on top of it.
      if (isLibraryBelow(location.state)) navigate(-1)
      else navigate('/', { replace: true })
      return
    }
    // Replace: back from the library must not reopen the frame. The library entry the frame was
    // opened from, if any, is now below the viewer.
    const state = isLibraryBelow(location.state) ? LIBRARY_BELOW_STATE : null
    navigate(photoPath('/', photoId), { replace: true, state })
  }
}
