import { type JSX, useState } from 'react'
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel.tsx'
import { VIEWER_BUTTON_CLASSES } from '@/components/viewer/viewerClasses.ts'
import { useCarouselArrowKeys } from '@/hooks/useCarouselArrowKeys.ts'
import { useCarouselPhoto } from '@/hooks/useCarouselPhoto.ts'
import { cn } from '@/lib/utils.ts'
import type { Photo } from '@/photo.ts'
import { photoLabel } from '@/photoLabel.ts'

// At the first or last photo the arrow has nowhere to go: it steps aside.
const ARROW_CLASSES = cn(VIEWER_BUTTON_CLASSES, 'disabled:opacity-0')

type ViewerCarouselProps = {
  photos: Photo[]
  currentId: string
  onCurrentChange: (photoId: string) => void
}

export function ViewerCarousel({
  photos,
  currentId,
  onCurrentChange,
}: ViewerCarouselProps): JSX.Element {
  const [api, setApi] = useState<CarouselApi>()
  // Frozen at mount: Embla re-inits on new options, and would on every swipe.
  const [options] = useState(() => ({
    startIndex: photos.findIndex(({ id }) => id === currentId),
  }))
  useCarouselPhoto({ api, photos, currentId, onCurrentChange })
  useCarouselArrowKeys(api)

  return (
    <Carousel setApi={setApi} opts={options}>
      <CarouselContent>
        {photos.map((photo) => (
          <CarouselItem key={photo.id}>
            <img
              className="h-svh w-full object-contain"
              src={photo.url}
              alt={photoLabel(photo)}
              loading={photo.id === currentId ? 'eager' : 'lazy'}
              decoding="async"
              // The browser's own image drag would steal the mouse from the carousel's swipe.
              draggable={false}
            />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious
        variant="ghost"
        aria-label="Photo précédente"
        className={cn(ARROW_CLASSES, 'left-[max(1rem,env(safe-area-inset-left))]')}
      />
      <CarouselNext
        variant="ghost"
        aria-label="Photo suivante"
        className={cn(ARROW_CLASSES, 'right-[max(1rem,env(safe-area-inset-right))]')}
      />
    </Carousel>
  )
}
