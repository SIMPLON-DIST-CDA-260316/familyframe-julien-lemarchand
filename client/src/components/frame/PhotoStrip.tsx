import type { JSX } from 'react'
import type { Photo } from '@/photo.ts'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

type PhotoStripProps = {
  photos: Photo[]
  currentId: string
  onSelect: (id: string) => void
}

// The slideshow moves on its own: keep its photo in sight in the strip.
function scrollIntoCenter(thumbnail: HTMLLIElement | null): void {
  const isMotionReduced = window.matchMedia(REDUCED_MOTION_QUERY).matches
  thumbnail?.scrollIntoView({
    inline: 'center',
    block: 'nearest',
    behavior: isMotionReduced ? 'instant' : 'smooth',
  })
}

export function PhotoStrip({ photos, currentId, onSelect }: PhotoStripProps): JSX.Element {
  return (
    <ul className="pointer-events-auto flex items-center gap-3 overflow-x-auto px-6 pt-2 pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {photos.map((photo) => (
        <li
          key={photo.id}
          // React calls a callback ref when it lands on another item: on each new current photo.
          ref={photo.id === currentId ? scrollIntoCenter : undefined}
          className="shrink-0"
        >
          <button
            type="button"
            onClick={() => onSelect(photo.id)}
            aria-current={photo.id === currentId}
            className="block rounded-lg opacity-50 outline-none transition duration-300 hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring aria-[current=true]:scale-110 aria-[current=true]:opacity-100 aria-[current=true]:ring-2 aria-[current=true]:ring-frame-accent motion-reduce:transition-none"
          >
            <img
              className="size-20 rounded-lg object-cover shadow-lg"
              src={photo.thumbnailUrl}
              alt={`Envoyée par ${photo.uploaderName}`}
              loading="lazy"
              decoding="async"
            />
          </button>
        </li>
      ))}
    </ul>
  )
}
