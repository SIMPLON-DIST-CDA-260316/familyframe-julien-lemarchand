import { type JSX, useState } from 'react'
import { PhotoStrip } from '@/components/frame/PhotoStrip.tsx'
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel.tsx'
import { useCarouselArrowKeys } from '@/hooks/useCarouselArrowKeys.ts'
import { useCarouselPhoto } from '@/hooks/useCarouselPhoto.ts'
import { useSlideshow } from '@/hooks/useSlideshow.ts'
import { cn } from '@/lib/utils.ts'
import type { Photo } from '@/photo.ts'

type PhotoViewProps = {
  photos: Photo[]
  currentId: string
  isStripVisible: boolean
  // null: no automatic advance.
  autoAdvanceMs: number | null
  onCurrentChange: (id: string) => void
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR')
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

  return (
    <div className="flex h-svh flex-col">
      <Carousel setApi={setApi} className="min-h-0 flex-1">
        <CarouselContent>
          {photos.map((photo) => (
            <CarouselItem key={photo.id} className="relative">
              <img
                className={cn('w-full object-contain', isStripVisible ? 'h-[80svh]' : 'h-svh')}
                src={photo.url}
                alt={`Envoyée par ${photo.uploaderName}`}
                // The photo people look at: ahead of the other slides.
                fetchPriority={photo.id === currentId ? 'high' : 'auto'}
              />
              <p className="absolute bottom-4 left-8 rounded-md bg-black/60 px-2 py-1 text-sm text-white">
                {photo.uploaderName} · {formatDate(photo.createdAt)}
              </p>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      {isStripVisible && (
        <PhotoStrip photos={photos} currentId={currentId} onSelect={onCurrentChange} />
      )}
    </div>
  )
}
