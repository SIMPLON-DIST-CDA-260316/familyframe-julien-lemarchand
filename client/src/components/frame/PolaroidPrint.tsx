import type { JSX, ReactNode } from 'react'
import { cn } from '@/lib/utils.ts'
import type { Photo } from '@/photo.ts'
import { formatPhotoDay } from '@/photoLabel.ts'

type PolaroidPrintProps = {
  photo: Photo
  // The photo itself, sized by the slide.
  children: ReactNode
}

// From the id, not the position in the slideshow: a photo arriving in front must not turn every
// print after it the other way.
function isTiltedLeft(photoId: string): boolean {
  let charCodeSum = 0
  for (const character of photoId) charCodeSum += character.charCodeAt(0)
  return charCodeSum % 2 === 0
}

export function PolaroidPrint({ photo, children }: PolaroidPrintProps): JSX.Element {
  return (
    // w-min: the print is as wide as its photo, and a long sender name wraps instead of widening it.
    <figure
      className={cn(
        'w-min bg-frame-print p-[3vmin] pb-0 text-black/75 shadow-2xl shadow-black/60',
        isTiltedLeft(photo.id) ? '-rotate-[1.5deg]' : 'rotate-[1.5deg]',
      )}
    >
      {children}
      <figcaption className="pt-[2vmin] pb-[3.5vmin]">
        <p className="text-[clamp(1rem,3vmin,2.25rem)] font-medium tracking-tight tabular-nums">
          <time dateTime={photo.createdAt}>{formatPhotoDay(photo.createdAt)}</time>
        </p>
        {photo.senderName !== null && (
          <p className="text-[clamp(0.875rem,2.2vmin,1.5rem)]">Envoyée par {photo.senderName}</p>
        )}
      </figcaption>
    </figure>
  )
}
