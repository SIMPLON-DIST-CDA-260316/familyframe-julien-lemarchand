import type { JSX } from 'react'
import { Badge } from '@/components/ui/badge.tsx'

type NewPhotosBadgeProps = {
  count: number
  onSelect: () => void
}

function newPhotosLabel(count: number): string {
  return count === 1 ? '1 nouvelle photo' : `${count} nouvelles photos`
}

export function NewPhotosBadge({ count, onSelect }: NewPhotosBadgeProps): JSX.Element {
  return (
    // The live region stays mounted: screen readers only announce changes to one that exists.
    <div aria-live="polite">
      {count > 0 && (
        <Badge
          asChild
          className="h-auto gap-2 rounded-full bg-frame-accent px-5 py-2 text-base font-medium text-black shadow-2xl motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-4 motion-safe:duration-500"
        >
          <button type="button" onClick={onSelect}>
            <span
              aria-hidden
              className="size-2 rounded-full bg-black/70 motion-safe:animate-pulse"
            />
            {newPhotosLabel(count)}
          </button>
        </Badge>
      )}
    </div>
  )
}
