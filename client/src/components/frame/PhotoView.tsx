import { type JSX, type ReactNode, useState } from 'react'
import { PhotoBackdrop } from '@/components/frame/PhotoBackdrop.tsx'
import { PhotoCaption } from '@/components/frame/PhotoCaption.tsx'
import { PhotoSlide } from '@/components/frame/PhotoSlide.tsx'
import { Carousel, type CarouselApi, CarouselContent } from '@/components/ui/carousel.tsx'
import { useCarouselArrowKeys } from '@/hooks/useCarouselArrowKeys.ts'
import { useCarouselPhoto } from '@/hooks/useCarouselPhoto.ts'
import { useLeavingPhoto } from '@/hooks/useLeavingPhoto.ts'
import { useSlideshow } from '@/hooks/useSlideshow.ts'
import type { Photo } from '@/photo.ts'

// Embla's default (25) is a quick flick; a frame on a wall should glide. Loop: after the oldest
// photo the newest comes in from the right, like any other next photo.
const GLIDING_LOOP = { duration: 45, loop: true }

type PhotoViewProps = {
  photos: Photo[]
  currentId: string
  // null: no automatic advance.
  autoAdvanceMs: number | null
  onCurrentChange: (id: string) => void
  // Under the caption, inside the carousel: the ‹ › buttons need its context.
  children: ReactNode
}

export function PhotoView({
  photos,
  currentId,
  autoAdvanceMs,
  onCurrentChange,
  children,
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
      <Carousel setApi={setApi} opts={GLIDING_LOOP}>
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
        <div className="pointer-events-none absolute inset-x-0 bottom-0 isolate">
          {/* The shade is there for the controls: at rest it fades out with them (FramePage sets data-idle). */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-linear-to-t from-black/75 via-black/30 to-transparent transition-opacity duration-500 motion-reduce:transition-none group-data-[idle=true]/frame:opacity-0"
          />
          {currentPhoto && <PhotoCaption key={currentPhoto.id} photo={currentPhoto} />}
          {/* The bottom bar sits on top of this box: just above the strip when it is open. */}
          <div className="relative">{children}</div>
        </div>
      </Carousel>
    </div>
  )
}
