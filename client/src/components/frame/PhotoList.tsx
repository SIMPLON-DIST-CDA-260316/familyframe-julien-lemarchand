import type { JSX } from 'react'
import { PhotoListRow } from '@/components/frame/PhotoListRow.tsx'
import type { Photo } from '@/photo.ts'

type PhotoListProps = {
  photos: Photo[]
  // null on the library page: no photo is on screen there.
  currentId: string | null
  onSelect: (id: string) => void
}

export function PhotoList({ photos, currentId, onSelect }: PhotoListProps): JSX.Element {
  return (
    // The page's full width: thumbnails and « … » line up with the header's edges.
    <ul className="flex flex-col gap-1">
      {photos.map((photo) => (
        <PhotoListRow
          key={photo.id}
          photo={photo}
          isCurrent={photo.id === currentId}
          onSelect={onSelect}
        />
      ))}
    </ul>
  )
}
