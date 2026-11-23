import { useEffect } from 'react'
import type { CarouselApi } from '@/components/ui/carousel.tsx'

export const SLIDESHOW_INTERVALS_MS = [5_000, 10_000, 20_000]
export const DEFAULT_SLIDESHOW_INTERVAL_MS = 10_000

// intervalMs null: paused, or someone is using the frame.
export function useSlideshow(api: CarouselApi, intervalMs: number | null): void {
  useEffect(() => {
    if (!api || intervalMs === null) return
    const carousel = api
    const timer = setInterval(() => {
      // Past the oldest photo, start again from the newest.
      if (carousel.canScrollNext()) carousel.scrollNext()
      else carousel.scrollTo(0)
    }, intervalMs)
    return () => clearInterval(timer)
  }, [api, intervalMs])
}
