import type { JSX } from 'react'
import { CarouselItem } from '@/components/ui/carousel.tsx'
import { cn } from '@/lib/utils.ts'
import type { Photo } from '@/photo.ts'
import { photoLabel } from '@/photoLabel.ts'

type PhotoSlideProps = {
  photo: Photo
  isCurrent: boolean
  isZooming: boolean
}

export function PhotoSlide({ photo, isCurrent, isZooming }: PhotoSlideProps): JSX.Element {
  return (
    <CarouselItem
      // The Ken Burns zoom must not spill onto the neighbouring slide.
      className="overflow-hidden"
    >
      <img
        className={cn(
          'h-svh w-full object-contain drop-shadow-2xl',
          // Each photo starts its zoom when it arrives.
          isZooming && 'motion-safe:animate-ken-burns',
        )}
        src={photo.url}
        alt={photoLabel(photo)}
        // The photo on screen loads first; the others wait until the carousel nears them.
        loading={isCurrent ? 'eager' : 'lazy'}
        fetchPriority={isCurrent ? 'high' : 'auto'}
      />
    </CarouselItem>
  )
}
