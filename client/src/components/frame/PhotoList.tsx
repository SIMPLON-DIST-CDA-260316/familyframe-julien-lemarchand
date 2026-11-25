import type { JSX, ReactNode } from 'react'
import { PhotoListRow } from '@/components/frame/PhotoListRow.tsx'
import { DateGroup } from '@/components/library/DateGroup.tsx'
import type { PhotoDay } from '@/photoDays.ts'

type PhotoListProps = {
  days: PhotoDay[]
  // null on the library page: no photo is on screen there.
  currentId: string | null
  onSelect: (id: string) => void
  // Items placed before the photos: the library's uploads still on their way.
  children?: ReactNode
}

// The same days as the grid, children first in the first day. The page's full width:
// thumbnails and « … » line up with the header's edges.
export function PhotoList({ days, currentId, onSelect, children }: PhotoListProps): JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      {days.map((day, index) => (
        <DateGroup key={day.key} day={day}>
          <ul className="flex flex-col gap-1">
            {index === 0 && children}
            {day.photos.map((photo) => (
              <PhotoListRow
                key={photo.id}
                photo={photo}
                isCurrent={photo.id === currentId}
                onSelect={onSelect}
              />
            ))}
          </ul>
        </DateGroup>
      ))}
    </div>
  )
}
