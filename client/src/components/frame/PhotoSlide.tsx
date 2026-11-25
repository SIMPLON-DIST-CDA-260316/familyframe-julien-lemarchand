import type { JSX, ReactNode } from 'react'
import { PolaroidPrint } from '@/components/frame/PolaroidPrint.tsx'
import {
  hasKenBurns,
  IMAGE_CLASSES,
  MAT_CLASSES,
  SLIDE_CLASSES,
} from '@/components/frame/templateClasses.ts'
import { CarouselItem } from '@/components/ui/carousel.tsx'
import type { FrameTemplate } from '@/frameSettings.ts'
import { cn } from '@/lib/utils.ts'
import type { Photo } from '@/photo.ts'
import { photoLabel } from '@/photoLabel.ts'

type PhotoSlideProps = {
  photo: Photo
  template: FrameTemplate
  isCurrent: boolean
  isZooming: boolean
}

function framedImage(template: FrameTemplate, photo: Photo, image: ReactNode): ReactNode {
  if (template === 'mat') return <div className={MAT_CLASSES}>{image}</div>
  if (template === 'polaroid') return <PolaroidPrint photo={photo}>{image}</PolaroidPrint>
  return image
}

export function PhotoSlide({
  photo,
  template,
  isCurrent,
  isZooming,
}: PhotoSlideProps): JSX.Element {
  const image = (
    <img
      className={cn(
        IMAGE_CLASSES[template],
        // Each photo starts its zoom when it arrives.
        isZooming && hasKenBurns(template) && 'motion-safe:animate-ken-burns',
      )}
      src={photo.url}
      alt={photoLabel(photo)}
      // The photo on screen loads first; the others wait until the carousel nears them.
      loading={isCurrent ? 'eager' : 'lazy'}
      fetchPriority={isCurrent ? 'high' : 'auto'}
    />
  )

  return (
    // The Ken Burns zoom must not spill onto the neighbouring slide.
    <CarouselItem className={cn('overflow-hidden', SLIDE_CLASSES[template])}>
      {framedImage(template, photo, image)}
    </CarouselItem>
  )
}
