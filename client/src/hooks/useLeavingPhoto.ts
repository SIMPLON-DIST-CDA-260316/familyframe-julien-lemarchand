import { useEffect, useState } from 'react'
import type { CarouselApi } from '@/components/ui/carousel.tsx'

// The photo sliding off screen, until the carousel settles on the next one.
export function useLeavingPhoto(api: CarouselApi, currentId: string): string | null {
  const [shownId, setShownId] = useState(currentId)
  const [leavingId, setLeavingId] = useState<string | null>(null)

  // Adjusted during render, not in an effect: an effect would drop the zoom for one frame.
  if (currentId !== shownId) {
    setShownId(currentId)
    setLeavingId(shownId)
  }

  useEffect(() => {
    if (!api) return
    const carousel = api
    const clearLeaving = (): void => setLeavingId(null)
    carousel.on('settle', clearLeaving)
    // A photo prepended at the current position re-inits Embla without any glide, so no settle.
    carousel.on('reInit', clearLeaving)
    return () => {
      carousel.off('settle', clearLeaving)
      carousel.off('reInit', clearLeaving)
    }
  }, [api])

  return leavingId
}
