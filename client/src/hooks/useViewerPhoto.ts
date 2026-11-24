import { useEffect, useState } from 'react'
import type { PhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
import { missingPhotoStep, type SeenPhoto, shouldLoadAhead } from '@/viewerNavigation.ts'

type ViewerPhotoOptions = {
  library: PhotoLibrary
  openId: string
  show: (photoId: string) => void
  dismiss: () => void
}

// The open photo's index in the loaded list, -1 while it is not there.
export function useViewerPhoto({ library, openId, show, dismiss }: ViewerPhotoOptions): number {
  const index = library.photos.findIndex(({ id }) => id === openId)
  const [lastSeen, setLastSeen] = useState<SeenPhoto | null>(null)
  // Adjusted during render: once the photo is gone, its last place is what picks the next one.
  if (index >= 0 && (lastSeen?.id !== openId || lastSeen.index !== index)) {
    setLastSeen({ id: openId, index })
  }

  useEffect(() => {
    if (index >= 0) {
      if (shouldLoadAhead(index, library)) library.loadMore()
      return
    }
    const step = missingPhotoStep(openId, lastSeen, library)
    if (step.kind === 'loadMore') library.loadMore()
    if (step.kind === 'show') show(step.id)
    if (step.kind === 'close') dismiss()
  }, [index, openId, lastSeen, library, show, dismiss])

  return index
}
