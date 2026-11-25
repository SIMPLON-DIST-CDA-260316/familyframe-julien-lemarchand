import type { JSX } from 'react'
import type { Photo } from '@/photo.ts'
import { formatPhotoDay, quotedMessage } from '@/photoLabel.ts'

type PhotoCaptionProps = {
  photo: Photo
}

export function PhotoCaption({ photo }: PhotoCaptionProps): JSX.Element {
  return (
    <div className="px-10 pt-24 pb-8 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-700">
      <p className="text-3xl font-medium tracking-tight text-white tabular-nums drop-shadow-md">
        <time dateTime={photo.createdAt}>{formatPhotoDay(photo.createdAt)}</time>
      </p>
      {photo.senderName !== null && (
        <p className="mt-1 text-xl font-medium tracking-tight text-white drop-shadow-md">
          Envoyée par {photo.senderName}
        </p>
      )}
      {/* Three lines at most: the photo stays the subject, a longer note is read in the library. */}
      {photo.message !== null && (
        <p className="mt-3 line-clamp-3 max-w-3xl text-2xl whitespace-pre-line text-white drop-shadow-md">
          {quotedMessage(photo.message)}
        </p>
      )}
    </div>
  )
}
