import type { JSX, ReactNode } from 'react'
import { PhotoListRow } from '@/components/frame/PhotoListRow.tsx'
import { DateGroup } from '@/components/library/DateGroup.tsx'
import type { PhotoDay } from '@/photoDays.ts'

type PhotoListProps = {
  days: PhotoDay[]
  // null on the library page: no photo is on screen there.
  currentId: string | null
  onSelect: (id: string) => void
  // Items placed before the photos of the day keyed childrenDayKey: the library's uploads still
  // on their way, under today.
  children?: ReactNode
  childrenDayKey?: string
}

// The same days as the grid, children first in their day. The page's full width:
// thumbnails and « … » line up with the header's edges.
export function PhotoList({
  days,
  currentId,
  onSelect,
  children,
  childrenDayKey,
}: PhotoListProps): JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      {days.map((day) => (
        <DateGroup key={day.key} day={day}>
          <ul className="flex flex-col gap-1">
            {day.key === childrenDayKey && children}
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
