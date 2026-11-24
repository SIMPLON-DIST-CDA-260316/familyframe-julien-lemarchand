import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { isLibraryBelow, LIBRARY_BELOW_STATE, PHOTO_PARAM } from '@/viewerHistory.ts'

export type ViewerParam = {
  openId: string | null
  open: (photoId: string) => void
  show: (photoId: string) => void
  close: () => void
  dismiss: () => void
}

export function useViewerParam(): ViewerParam {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const openId = searchParams.get(PHOTO_PARAM)

  function open(photoId: string): void {
    setSearchParams({ [PHOTO_PARAM]: photoId }, { state: LIBRARY_BELOW_STATE })
  }

  function show(photoId: string): void {
    if (photoId === openId) return
    // Replace: swiping through twenty photos must not take twenty back presses to leave.
    setSearchParams({ [PHOTO_PARAM]: photoId }, { replace: true, state: location.state })
  }

  // Replace, never back: the viewer calls it from an effect that may run twice.
  function dismiss(): void {
    setSearchParams({}, { replace: true })
  }

  function close(): void {
    if (isLibraryBelow(location.state)) navigate(-1)
    else dismiss()
  }

  return { openId, open, show, close, dismiss }
}
