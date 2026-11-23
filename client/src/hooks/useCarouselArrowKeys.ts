import { useEffect } from 'react'
import type { CarouselApi } from '@/components/ui/carousel.tsx'
import { isOverlayOpen } from '@/hooks/useIdle.ts'

export function useCarouselArrowKeys(api: CarouselApi): void {
  useEffect(() => {
    if (!api) return
    const carousel = api

    function handleKeyDown(event: KeyboardEvent): void {
      // A focused carousel already moved and prevented the default.
      // An open menu uses the arrows itself: the photo behind it must stay put.
      if (event.defaultPrevented || isOverlayOpen()) return
      if (event.key === 'ArrowLeft') carousel.scrollPrev()
      if (event.key === 'ArrowRight') carousel.scrollNext()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [api])
}
