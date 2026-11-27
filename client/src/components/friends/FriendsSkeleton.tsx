import type { JSX } from 'react'
import { LoadingStatus } from '@/components/feedback/LoadingStatus.tsx'
import { Skeleton } from '@/components/ui/skeleton.tsx'

// Placeholders never move: fixed keys are enough.
const ROW_KEYS = ['first', 'second', 'third']

// Shaped like the friends list: an avatar, a name and an address per row.
export function FriendsSkeleton(): JSX.Element {
  return (
    <LoadingStatus className="flex flex-col divide-y rounded-xl border">
      {ROW_KEYS.map((key) => (
        <div key={key} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-44" />
          </div>
        </div>
      ))}
    </LoadingStatus>
  )
}
