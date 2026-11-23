import { useEffect, useLayoutEffect } from 'react'
import type { CarouselApi } from '@/components/ui/carousel.tsx'
import type { Photo } from '@/photo.ts'

type CarouselPhotoOptions = {
  api: CarouselApi
  photos: Photo[]
  currentId: string
  onCurrentChange: (id: string) => void
}

export function useCarouselPhoto({
  api,
  photos,
  currentId,
  onCurrentChange,
}: CarouselPhotoOptions): void {
  const currentIndex = photos.findIndex(({ id }) => id === currentId)

  // Layout effect: the jump lands before paint, so the neighbour photo never flashes.
  useLayoutEffect(() => {
    if (!api || currentIndex < 0) return
    // A prepended photo re-inits Embla on its old index, which now holds another photo.
    const showCurrent = (): void => {
      if (api.selectedScrollSnap() !== currentIndex) api.scrollTo(currentIndex, true)
    }
    showCurrent()
    api.on('reInit', showCurrent)
    return () => {
      api.off('reInit', showCurrent)
    }
  }, [api, currentIndex])

  useEffect(() => {
    if (!api) return
    const reportSelection = (): void => {
      const selectedPhoto = photos[api.selectedScrollSnap()]
      if (selectedPhoto) onCurrentChange(selectedPhoto.id)
    }
    api.on('select', reportSelection)
    return () => {
      api.off('select', reportSelection)
    }
  }, [api, photos, onCurrentChange])
}
