import { type JSX, useState } from 'react'
import { PhotoBackdrop } from '@/components/frame/PhotoBackdrop.tsx'
import { PhotoCaption } from '@/components/frame/PhotoCaption.tsx'
import { PhotoSlide } from '@/components/frame/PhotoSlide.tsx'
import { PhotoStrip } from '@/components/frame/PhotoStrip.tsx'
import { Carousel, type CarouselApi, CarouselContent } from '@/components/ui/carousel.tsx'
import { useCarouselArrowKeys } from '@/hooks/useCarouselArrowKeys.ts'
import { useCarouselPhoto } from '@/hooks/useCarouselPhoto.ts'
import { useLeavingPhoto } from '@/hooks/useLeavingPhoto.ts'
import { useSlideshow } from '@/hooks/useSlideshow.ts'
import type { Photo } from '@/photo.ts'

// Embla's default (25) is a quick flick; a frame on a wall should glide.
const GLIDING_SLIDE = { duration: 45 }

type PhotoViewProps = {
  photos: Photo[]
  currentId: string
  isStripVisible: boolean
  // null: no automatic advance.
  autoAdvanceMs: number | null
  onCurrentChange: (id: string) => void
}

export function PhotoView({
  photos,
  currentId,
  isStripVisible,
  autoAdvanceMs,
  onCurrentChange,
}: PhotoViewProps): JSX.Element {
  const [api, setApi] = useState<CarouselApi>()
  useCarouselPhoto({ api, photos, currentId, onCurrentChange })
  useCarouselArrowKeys(api)
  useSlideshow(api, autoAdvanceMs)
  // The outgoing photo keeps its zoom while it slides out, instead of snapping back.
  const leavingId = useLeavingPhoto(api, currentId)
  const currentPhoto = photos.find(({ id }) => id === currentId)

  return (
    // clip, not hidden: the scaled backdrop overflows, and a hidden box can still be scrolled.
    <div className="relative isolate h-svh overflow-clip">
      {currentPhoto && <PhotoBackdrop key={currentPhoto.id} url={currentPhoto.thumbnailUrl} />}
      <Carousel setApi={setApi} opts={GLIDING_SLIDE}>
        <CarouselContent>
          {photos.map((photo) => (
            <PhotoSlide
              key={photo.id}
              photo={photo}
              isCurrent={photo.id === currentId}
              isZooming={photo.id === currentId || photo.id === leavingId}
            />
          ))}
        </CarouselContent>
      </Carousel>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/75 via-black/30 to-transparent">
        {currentPhoto && <PhotoCaption key={currentPhoto.id} photo={currentPhoto} />}
        {isStripVisible && (
          <PhotoStrip photos={photos} currentId={currentId} onSelect={onCurrentChange} />
        )}
      </div>
    </div>
  )
}
