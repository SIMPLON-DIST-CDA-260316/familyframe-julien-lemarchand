import type { JSX } from 'react'
import { LoadingStatus } from '@/components/feedback/LoadingStatus.tsx'
import { Skeleton } from '@/components/ui/skeleton.tsx'

// Placeholders never move: fixed keys are enough.
const ROW_KEYS = ['first', 'second', 'third']

// Shaped like the invitations list: an address and a date, the status badge on the right.
export function InvitationsSkeleton(): JSX.Element {
  return (
    <LoadingStatus className="flex flex-col divide-y">
      {ROW_KEYS.map((key) => (
        <div key={key} className="flex items-center justify-between gap-3 py-3">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-5 w-16 rounded-4xl" />
        </div>
      ))}
    </LoadingStatus>
  )
}
