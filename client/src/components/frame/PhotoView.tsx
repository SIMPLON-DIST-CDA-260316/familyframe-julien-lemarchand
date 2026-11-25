import { type JSX, type ReactNode, useState } from 'react'
import { PhotoBackdrop } from '@/components/frame/PhotoBackdrop.tsx'
import { PhotoCaption } from '@/components/frame/PhotoCaption.tsx'
import { PhotoSlide } from '@/components/frame/PhotoSlide.tsx'
import { hasBackdrop, hasCaptionOverlay } from '@/components/frame/templateClasses.ts'
import { Carousel, type CarouselApi, CarouselContent } from '@/components/ui/carousel.tsx'
import type { FrameTemplate } from '@/frameSettings.ts'
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
  template: FrameTemplate
  // null: no automatic advance.
  autoAdvanceMs: number | null
  onCurrentChange: (id: string) => void
  // Under the caption, inside the carousel: the ‹ › buttons need its context.
  children: ReactNode
}

type BottomOverlayProps = {
  // undefined: no caption, as on a polaroid.
  captionPhoto: Photo | undefined
  children: ReactNode
}

function BottomOverlay({ captionPhoto, children }: BottomOverlayProps): JSX.Element {
  return (
    // The caption and the buttons stay above the home bar and beside a sideways notch.
    <div className="pointer-events-none absolute inset-x-0 bottom-0 isolate pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]">
      {/* The shade is there for the controls: at rest it fades out with them (FramePage sets data-idle). */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-linear-to-t from-black/75 via-black/30 to-transparent transition-opacity duration-500 motion-reduce:transition-none group-data-[idle=true]/frame:opacity-0"
      />
      {captionPhoto && <PhotoCaption key={captionPhoto.id} photo={captionPhoto} />}
      {/* The bottom bar sits on top of this box: just above the strip when it is open. */}
      <div className="relative">{children}</div>
    </div>
  )
}

type SlideshowCarousel = {
  setApi: (api: CarouselApi) => void
  leavingId: string | null
}

function useSlideshowCarousel({
  photos,
  currentId,
  autoAdvanceMs,
  onCurrentChange,
}: Omit<PhotoViewProps, 'template' | 'children'>): SlideshowCarousel {
  const [api, setApi] = useState<CarouselApi>()
  useCarouselPhoto({ api, photos, currentId, onCurrentChange })
  useCarouselArrowKeys(api)
  useSlideshow(api, autoAdvanceMs)
  // The outgoing photo keeps its zoom while it slides out, instead of snapping back.
  return { setApi, leavingId: useLeavingPhoto(api, currentId) }
}

export function PhotoView({ template, children, ...carouselProps }: PhotoViewProps): JSX.Element {
  const { photos, currentId } = carouselProps
  const { setApi, leavingId } = useSlideshowCarousel(carouselProps)
  const currentPhoto = photos.find(({ id }) => id === currentId)

  return (
    // clip, not hidden: the scaled backdrop overflows, and a hidden box can still be scrolled.
    <div className="relative isolate h-svh overflow-clip">
      {currentPhoto && hasBackdrop(template) && (
        <PhotoBackdrop key={currentPhoto.id} url={currentPhoto.thumbnailUrl} />
      )}
      <Carousel setApi={setApi} opts={GLIDING_LOOP}>
        <CarouselContent>
          {photos.map((photo) => (
            <PhotoSlide
              key={photo.id}
              photo={photo}
              template={template}
              isCurrent={photo.id === currentId}
              isZooming={photo.id === currentId || photo.id === leavingId}
            />
          ))}
        </CarouselContent>
        <BottomOverlay captionPhoto={hasCaptionOverlay(template) ? currentPhoto : undefined}>
          {children}
        </BottomOverlay>
      </Carousel>
    </div>
  )
}
