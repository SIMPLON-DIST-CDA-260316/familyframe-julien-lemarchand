import type { JSX, ReactNode } from 'react'
import { PhotoGridTile } from '@/components/frame/PhotoGridTile.tsx'
import type { Photo } from '@/photo.ts'

type PhotoGridProps = {
  photos: Photo[]
  // null on the library page: no photo is on screen there.
  currentId: string | null
  onSelect: (id: string) => void
  // Items placed before the photos: the library's uploads still on their way.
  children?: ReactNode
}

// Edge to edge with the page's header. Three tight columns on a phone, as photo apps do, so a
// screen shows a dozen photos. From sm, as many ~12rem columns as fit.
const GRID_CLASSES =
  'grid grid-cols-3 gap-1 sm:grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] sm:gap-4'

export function PhotoGrid({ photos, currentId, onSelect, children }: PhotoGridProps): JSX.Element {
  return (
    <ul className={GRID_CLASSES}>
      {children}
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
