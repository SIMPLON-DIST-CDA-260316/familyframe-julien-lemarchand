import type { JSX } from 'react'
import { PhotoGridTile } from '@/components/frame/PhotoGridTile.tsx'
import type { Photo } from '@/photo.ts'

type PhotoGridProps = {
  photos: Photo[]
  // null on the library page: no photo is on screen there.
  currentId: string | null
  onSelect: (id: string) => void
}

export function PhotoGrid({ photos, currentId, onSelect }: PhotoGridProps): JSX.Element {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-4 p-8">
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
