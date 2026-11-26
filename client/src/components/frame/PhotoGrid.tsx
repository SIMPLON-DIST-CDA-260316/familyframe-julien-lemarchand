import type { JSX, ReactNode } from 'react'
import { PhotoGridTile } from '@/components/frame/PhotoGridTile.tsx'
import { DateGroup } from '@/components/library/DateGroup.tsx'
import type { PhotoDay } from '@/photoDays.ts'

type PhotoGridProps = {
  days: PhotoDay[]
  // null on the library page: no photo is on screen there.
  currentId: string | null
  onSelect: (id: string) => void
  // Items placed before the photos of the day keyed childrenDayKey: the library's uploads still
  // on their way, under today.
  children?: ReactNode
  childrenDayKey?: string
}

// Edge to edge with the page's header. Three tight columns on a phone, as photo apps do, so a
// screen shows a dozen photos. From sm, as many ~12rem columns as fit; from md the collections
// sidebar narrows the column: three, then four from lg.
export const GRID_CLASSES =
  'grid grid-cols-3 gap-1 sm:grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] sm:gap-4 md:grid-cols-3 lg:grid-cols-4'

// One grid per day, under its date: a day with two photos leaves the rest of its row empty.
// children go first in their day, « Aujourd'hui », where their photos appear once sent.
export function PhotoGrid({
  days,
  currentId,
  onSelect,
  children,
  childrenDayKey,
}: PhotoGridProps): JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      {days.map((day) => (
        <DateGroup key={day.key} day={day}>
          <ul className={GRID_CLASSES}>
            {day.key === childrenDayKey && children}
            {day.photos.map((photo) => (
              <PhotoGridTile
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
