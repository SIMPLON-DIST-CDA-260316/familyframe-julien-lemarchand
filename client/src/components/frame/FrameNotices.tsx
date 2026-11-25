import type { JSX } from 'react'
import { NewPhotosBadge } from '@/components/frame/NewPhotosBadge.tsx'
import { WaitingPhotosBadge } from '@/components/frame/WaitingPhotosBadge.tsx'

type FrameNoticesProps = {
  waitingCount: number
  newPhotoCount: number
  onReveal: () => void
  onShowNewest: () => void
}

// One column at the top centre, between ✕ and ⋯: two pills stack instead of covering each other.
// Outside the slideshow, so the waiting photos show on the screens without photos too.
export function FrameNotices({
  waitingCount,
  newPhotoCount,
  onReveal,
  onShowNewest,
}: FrameNoticesProps): JSX.Element {
  return (
    <div className="fixed top-[calc(1.5rem_+_env(safe-area-inset-top))] left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-3">
      <WaitingPhotosBadge count={waitingCount} onSelect={onReveal} />
      <NewPhotosBadge count={newPhotoCount} onSelect={onShowNewest} />
    </div>
  )
}
