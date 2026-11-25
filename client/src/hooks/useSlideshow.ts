import { useEffect } from 'react'
import type { CarouselApi } from '@/components/ui/carousel.tsx'

// intervalMs null: paused, or someone is using the frame.
export function useSlideshow(api: CarouselApi, intervalMs: number | null): void {
  useEffect(() => {
    if (!api || intervalMs === null) return
    const carousel = api
    const advance = (): void => {
      // The carousel loops; with too few photos to loop, Embla stops at the oldest one.
      if (carousel.canScrollNext()) carousel.scrollNext()
      else carousel.scrollTo(0)
    }
    let timer = setInterval(advance, intervalMs)
    // A new photo re-inits Embla: give it a full interval on screen.
    const restart = (): void => {
      clearInterval(timer)
      timer = setInterval(advance, intervalMs)
    }
    carousel.on('reInit', restart)
    return () => {
      clearInterval(timer)
      carousel.off('reInit', restart)
    }
  }, [api, intervalMs])
}
