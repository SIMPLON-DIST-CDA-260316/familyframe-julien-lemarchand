import { type JSX, useState } from 'react'
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel.tsx'
import { chromeClasses, VIEWER_BUTTON_CLASSES } from '@/components/viewer/viewerClasses.ts'
import { useCarouselArrowKeys } from '@/hooks/useCarouselArrowKeys.ts'
import { useCarouselPhoto } from '@/hooks/useCarouselPhoto.ts'
import type { ViewerChrome } from '@/hooks/useViewerChrome.ts'
import { cn } from '@/lib/utils.ts'
import type { Photo } from '@/photo.ts'
import { photoLabel } from '@/photoLabel.ts'

// At the first or last photo the arrow has nowhere to go: it steps aside. A finger swipes: no
// arrows on a touch screen.
const ARROW_CLASSES = cn(VIEWER_BUTTON_CLASSES, 'disabled:opacity-0 pointer-coarse:hidden')

type ViewerCarouselProps = {
  photos: Photo[]
  currentId: string
  onCurrentChange: (photoId: string) => void
  chrome: ViewerChrome
}

export function ViewerCarousel({
  photos,
  currentId,
  onCurrentChange,
  chrome,
}: ViewerCarouselProps): JSX.Element {
  const [api, setApi] = useState<CarouselApi>()
  // Frozen at mount: Embla re-inits on new options, and would on every swipe.
  const [options] = useState(() => ({
    startIndex: photos.findIndex(({ id }) => id === currentId),
  }))
  useCarouselPhoto({ api, photos, currentId, onCurrentChange })
  useCarouselArrowKeys(api)
  const arrowClasses = cn(ARROW_CLASSES, chromeClasses(chrome.isVisible))

  return (
    <Carousel setApi={setApi} opts={options}>
      <CarouselContent>
        {photos.map((photo) => (
          <CarouselItem key={photo.id}>
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: the tap toggle is for touch; a keyboard shows the controls with Tab (useViewerChrome). */}
            <img
              className="h-svh w-full object-contain"
              src={photo.url}
              alt={photoLabel(photo)}
              loading={photo.id === currentId ? 'eager' : 'lazy'}
              decoding="async"
              // The browser's own image drag would steal the mouse from the carousel's swipe.
              draggable={false}
              onPointerDown={chrome.onPhotoPointerDown}
              onClick={chrome.onPhotoClick}
            />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious
        variant="ghost"
        aria-label="Photo précédente"
        data-viewer-controls
        inert={!chrome.isVisible}
        className={cn(arrowClasses, 'left-[max(1rem,env(safe-area-inset-left))]')}
      />
      <CarouselNext
        variant="ghost"
        aria-label="Photo suivante"
        data-viewer-controls
        inert={!chrome.isVisible}
        className={cn(arrowClasses, 'right-[max(1rem,env(safe-area-inset-right))]')}
      />
    </Carousel>
  )
}
