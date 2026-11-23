import type { JSX } from 'react'
import { LibraryHeader } from '@/components/frame/LibraryHeader.tsx'
import { PhotoGrid } from '@/components/frame/PhotoGrid.tsx'
import type { Photo } from '@/photo.ts'

type LibraryScreenProps = {
  photos: Photo[]
  currentId: string
  onOpenPhoto: (id: string) => void
  onStartSlideshow: () => void
}

export function LibraryScreen({
  photos,
  currentId,
  onOpenPhoto,
  onStartSlideshow,
}: LibraryScreenProps): JSX.Element {
  return (
    <>
      <LibraryHeader photoCount={photos.length} onStartSlideshow={onStartSlideshow} />
      <PhotoGrid photos={photos} currentId={currentId} onSelect={onOpenPhoto} />
    </>
  )
}
