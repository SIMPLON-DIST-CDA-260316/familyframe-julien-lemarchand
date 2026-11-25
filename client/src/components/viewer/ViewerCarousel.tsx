import { type JSX, useEffect, useRef, useState } from 'react'
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel.tsx'
import { ViewerImage } from '@/components/viewer/ViewerImage.tsx'
import { chromeClasses, VIEWER_BUTTON_CLASSES } from '@/components/viewer/viewerClasses.ts'
import { useCarouselArrowKeys } from '@/hooks/useCarouselArrowKeys.ts'
import { useCarouselPhoto } from '@/hooks/useCarouselPhoto.ts'
import type { ViewerChrome } from '@/hooks/useViewerChrome.ts'
import { useViewerGestures, type ViewerGestures } from '@/hooks/useViewerGestures.ts'
import { useViewerKeys } from '@/hooks/useViewerKeys.ts'
import { cn } from '@/lib/utils.ts'
import type { Photo } from '@/photo.ts'

// At the first or last photo the arrow has nowhere to go: it steps aside. A finger swipes: no
// arrows on a touch screen.
const ARROW_CLASSES = cn(VIEWER_BUTTON_CLASSES, 'disabled:opacity-0 pointer-coarse:hidden')

// One key press enlarges by half: four presses go from the whole photo to the largest zoom.
const KEY_ZOOM_FACTOR = 1.5

type FrozenOptions = { startIndex: number; watchDrag: () => boolean }

// Frozen at mount: Embla re-inits on new options, and would on every swipe. watchDrag reads the
// zoom through a ref, so the frozen function still sees it change.
function useFrozenOptions(
  photos: Photo[],
  currentId: string,
  { isZoomed }: ViewerGestures,
): FrozenOptions {
  const isZoomedRef = useRef(isZoomed)
  useEffect(() => {
    isZoomedRef.current = isZoomed
  }, [isZoomed])
  const [options] = useState<FrozenOptions>(() => ({
    startIndex: photos.findIndex(({ id }) => id === currentId),
    // A zoomed photo pans under the finger instead of swiping to the next one.
    watchDrag: () => !isZoomedRef.current,
  }))
  return options
}

// + and = share a key on most keyboards: either one zooms in.
function useZoomKeys({ zoomByStep }: ViewerGestures): void {
  useViewerKeys({
    '+': () => zoomByStep(KEY_ZOOM_FACTOR),
    '=': () => zoomByStep(KEY_ZOOM_FACTOR),
    '-': () => zoomByStep(1 / KEY_ZOOM_FACTOR),
  })
}

type ViewerCarouselProps = {
  photos: Photo[]
  currentId: string
  onCurrentChange: (photoId: string) => void
  onClose: () => void
  chrome: ViewerChrome
}

export function ViewerCarousel({
  photos,
  currentId,
  onCurrentChange,
  onClose,
  chrome,
}: ViewerCarouselProps): JSX.Element {
  const [api, setApi] = useState<CarouselApi>()
  const gestures = useViewerGestures({ photoId: currentId, onClose })
  const options = useFrozenOptions(photos, currentId, gestures)
  useCarouselPhoto({ api, photos, currentId, onCurrentChange })
  useCarouselArrowKeys(api)
  useZoomKeys(gestures)

  return (
    <Carousel setApi={setApi} opts={options}>
      <CarouselContent>
        {photos.map((photo) => (
          <CarouselItem key={photo.id} className="overflow-hidden">
            <ViewerImage
              photo={photo}
              isCurrent={photo.id === currentId}
              gestures={gestures}
              chrome={chrome}
            />
          </CarouselItem>
        ))}
      </CarouselContent>
      <ViewerArrows isVisible={chrome.isVisible} />
    </Carousel>
  )
}

function ViewerArrows({ isVisible }: { isVisible: boolean }): JSX.Element {
  const arrowClasses = cn(ARROW_CLASSES, chromeClasses(isVisible))
  return (
    <>
      <CarouselPrevious
        variant="ghost"
        aria-label="Photo précédente"
        data-viewer-controls
        inert={!isVisible}
        className={cn(arrowClasses, 'left-[max(1rem,env(safe-area-inset-left))]')}
      />
      <CarouselNext
        variant="ghost"
        aria-label="Photo suivante"
        data-viewer-controls
        inert={!isVisible}
        className={cn(arrowClasses, 'right-[max(1rem,env(safe-area-inset-right))]')}
      />
    </>
  )
}
