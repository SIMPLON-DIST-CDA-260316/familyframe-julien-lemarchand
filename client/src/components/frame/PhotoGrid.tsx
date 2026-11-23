import type { JSX } from 'react'
import { PhotoGridTile } from '@/components/frame/PhotoGridTile.tsx'
import type { Photo } from '@/photo.ts'

type PhotoGridProps = {
  photos: Photo[]
  currentId: string
  onSelect: (id: string) => void
}

export function PhotoGrid({ photos, currentId, onSelect }: PhotoGridProps): JSX.Element {
  return (
    // pt-24 keeps the first row clear of the fixed library header.
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-4 p-8 pt-24">
      {photos.map((photo) => (
        <PhotoGridTile
          key={photo.id}
          photo={photo}
          isCurrent={photo.id === currentId}
          onSelect={onSelect}
        />
      ))}
    </ul>
  )
}
