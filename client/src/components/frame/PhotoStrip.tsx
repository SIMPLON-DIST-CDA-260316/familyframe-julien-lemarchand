import { type JSX, useRef } from 'react'
import { useDragScroll } from '@/hooks/useDragScroll.ts'
import { cn } from '@/lib/utils.ts'
import type { Photo } from '@/photo.ts'
import { photoLabel } from '@/photoLabel.ts'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

type PhotoStripProps = {
  isVisible: boolean
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

export function PhotoStrip({
  isVisible,
  photos,
  currentId,
  onSelect,
}: PhotoStripProps): JSX.Element {
  const listRef = useRef<HTMLUListElement>(null)
  useDragScroll(listRef)

  return (
    // Kept mounted so it can slide out. The height glides too, carrying the bar above it along;
    // clip, not hidden: a hidden box is a scroll container that scrollIntoView would move.
    <div
      inert={!isVisible}
      className={cn(
        'grid transition-[grid-template-rows] duration-500 ease-in-out motion-reduce:transition-none',
        isVisible ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
      )}
    >
      <div className="min-h-0 overflow-clip">
        <ul
          ref={listRef}
          className={cn(
            'pointer-events-auto flex cursor-grab items-center select-none active:cursor-grabbing gap-3 overflow-x-auto px-6 pt-2 pb-6 transition-[opacity,translate] duration-500 ease-in-out [scrollbar-width:none] motion-reduce:transition-none [&::-webkit-scrollbar]:hidden',
            isVisible ? 'opacity-100' : 'translate-y-full opacity-0',
          )}
        >
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
                  alt={photoLabel(photo)}
                  loading="lazy"
                  decoding="async"
                  // The browser's own image drag would steal the mouse from the strip's scroll.
                  draggable={false}
                />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
