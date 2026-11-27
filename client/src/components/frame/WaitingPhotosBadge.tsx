import { MailIcon } from 'lucide-react'
import type { JSX } from 'react'
import { waitingPhotosLabel } from '@/components/mail/mailTexts.ts'
import { Badge } from '@/components/ui/badge.tsx'

type WaitingPhotosBadgeProps = {
  count: number
  onSelect: () => void
}

// The print's white, not the accent of the arrivals pill: a letter waiting, not a photo playing.
export function WaitingPhotosBadge({ count, onSelect }: WaitingPhotosBadgeProps): JSX.Element {
  return (
    // The live region stays mounted: screen readers only announce changes to one that exists.
    <div aria-live="polite">
      {count > 0 && (
        <Badge
          asChild
          className="h-auto gap-2 rounded-full pointer-coarse:min-h-11 bg-frame-print px-5 py-2 text-base font-medium text-frame-print-foreground shadow-2xl motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-4 motion-safe:duration-500"
        >
          <button type="button" onClick={onSelect}>
            <MailIcon aria-hidden className="size-4" />
            {waitingPhotosLabel(count)}
          </button>
        </Badge>
      )}
    </div>
  )
}
