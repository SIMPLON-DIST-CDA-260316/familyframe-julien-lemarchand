import type { JSX } from 'react'
import type { Photo } from '@/photo.ts'
import { formatPhotoDay, quotedMessage } from '@/photoLabel.ts'

type ViewerCaptionProps = {
  photo: Photo
}

export function ViewerCaption({ photo }: ViewerCaptionProps): JSX.Element {
  return (
    // Swipes over the caption must still reach the carousel underneath. The text stays above the
    // home bar and beside a sideways notch.
    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent pt-16 pr-[max(1.5rem,env(safe-area-inset-right))] pb-[calc(1.5rem_+_env(safe-area-inset-bottom))] pl-[max(1.5rem,env(safe-area-inset-left))] text-white">
      <p className="text-lg font-medium tabular-nums drop-shadow-md">
        <time dateTime={photo.createdAt}>{formatPhotoDay(photo.createdAt)}</time>
      </p>
      {photo.senderName !== null && (
        <p className="text-sm text-white/80 drop-shadow-md">Envoyée par {photo.senderName}</p>
      )}
      {photo.message !== null && (
        <p className="mt-2 text-base break-words whitespace-pre-line drop-shadow-md">
          {quotedMessage(photo.message)}
        </p>
      )}
    </div>
  )
}
