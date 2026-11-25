import type { JSX } from 'react'
import { LoadingStatus } from '@/components/feedback/LoadingStatus.tsx'
import { GRID_CLASSES } from '@/components/frame/PhotoGrid.tsx'
import { Skeleton } from '@/components/ui/skeleton.tsx'
import type { LibraryLayout } from '@/hooks/useLibraryLayout.ts'

// About one phone screen of tiles, or of rows: enough to fill the view before the photos land.
// Placeholders never move: fixed keys are enough.
const TILE_KEYS = Array.from({ length: 12 }, (_, position) => `tile-${position}`)
const ROW_KEYS = Array.from({ length: 6 }, (_, position) => `row-${position}`)

function GridSkeleton(): JSX.Element {
  return (
    <div className={GRID_CLASSES}>
      {TILE_KEYS.map((key) => (
        <Skeleton key={key} className="aspect-square rounded-sm sm:rounded-xl" />
      ))}
    </div>
  )
}

function ListSkeleton(): JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      {ROW_KEYS.map((key) => (
        <div key={key} className="flex items-center gap-3 py-1">
          <Skeleton className="size-14 shrink-0 rounded-lg" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}

// Shaped like the layout chosen, under a day's title: nothing jumps when the photos arrive.
export function LibrarySkeleton({ layout }: { layout: LibraryLayout }): JSX.Element {
  return (
    <LoadingStatus className="flex flex-col gap-2">
      <Skeleton className="h-5 w-24" />
      {layout === 'grid' ? <GridSkeleton /> : <ListSkeleton />}
    </LoadingStatus>
  )
}
