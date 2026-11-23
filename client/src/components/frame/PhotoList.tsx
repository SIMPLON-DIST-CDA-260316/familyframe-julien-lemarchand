import type { JSX } from 'react'
import { PhotoListRow } from '@/components/frame/PhotoListRow.tsx'
import type { Photo } from '@/photo.ts'

type PhotoListProps = {
  photos: Photo[]
  currentId: string
  onSelect: (id: string) => void
}

export function PhotoList({ photos, currentId, onSelect }: PhotoListProps): JSX.Element {
  return (
    // pt-24 keeps the first row clear of the fixed library header.
    <ul className="mx-auto flex max-w-3xl flex-col gap-1 p-8 pt-24">
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
