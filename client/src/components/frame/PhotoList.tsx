import type { JSX, ReactNode } from 'react'
import { PhotoListRow } from '@/components/frame/PhotoListRow.tsx'
import type { Photo } from '@/photo.ts'

type PhotoListProps = {
  photos: Photo[]
  // null on the library page: no photo is on screen there.
  currentId: string | null
  onSelect: (id: string) => void
  // Items placed before the photos: the library's uploads still on their way.
  children?: ReactNode
}

export function PhotoList({ photos, currentId, onSelect, children }: PhotoListProps): JSX.Element {
  return (
    // The page's full width: thumbnails and « … » line up with the header's edges.
    <ul className="flex flex-col gap-1">
      {children}
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
