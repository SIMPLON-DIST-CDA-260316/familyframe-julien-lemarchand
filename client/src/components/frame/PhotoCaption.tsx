import type { JSX } from 'react'
import type { Photo } from '@/photo.ts'

// The day is what matters on a wall: the time of the upload was noise.
const CAPTION_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}

type PhotoCaptionProps = {
  photo: Photo
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', CAPTION_DATE_FORMAT)
}

export function PhotoCaption({ photo }: PhotoCaptionProps): JSX.Element {
  return (
    <div className="px-10 pt-24 pb-8 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-700">
      {/* Stops short of the centred transport pill: a long name wraps instead of sliding under it. */}
      <p className="max-w-[calc(50%-6rem)] text-3xl font-medium tracking-tight text-balance text-white drop-shadow-md">
        {photo.uploaderName}
      </p>
      <p className="mt-1 text-base text-white/70 tabular-nums">{formatDate(photo.createdAt)}</p>
    </div>
  )
}
