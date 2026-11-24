import type { JSX } from 'react'
import type { Photo } from '@/photo.ts'
import { formatPhotoDay } from '@/photoLabel.ts'

type PhotoCaptionProps = {
  photo: Photo
}

export function PhotoCaption({ photo }: PhotoCaptionProps): JSX.Element {
  return (
    <div className="px-10 pt-24 pb-8 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-700">
      <p className="text-3xl font-medium tracking-tight text-white tabular-nums drop-shadow-md">
        <time dateTime={photo.createdAt}>{formatPhotoDay(photo.createdAt)}</time>
      </p>
    </div>
  )
}
