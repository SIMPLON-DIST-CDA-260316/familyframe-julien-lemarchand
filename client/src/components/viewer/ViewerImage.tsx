import type { CSSProperties, JSX } from 'react'
import { CLOSE_DRAG_DISTANCE_PX } from '@/hooks/useDragToClose.ts'
import type { ViewerChrome } from '@/hooks/useViewerChrome.ts'
import type { ViewerGestures } from '@/hooks/useViewerGestures.ts'
import { cn } from '@/lib/utils.ts'
import type { Photo } from '@/photo.ts'
import { photoLabel } from '@/photoLabel.ts'
import { zoomTransform } from '@/photoZoom.ts'

type ViewerImageProps = {
  photo: Photo
  isCurrent: boolean
  gestures: ViewerGestures
  chrome: ViewerChrome
}

// The photo fades as it is pulled down: past the closing distance it is see-through by half.
function imageStyle({ zoom, dragOffset }: ViewerGestures): CSSProperties {
  const fade = Math.min(dragOffset / CLOSE_DRAG_DISTANCE_PX, 1) / 2
  return { transform: zoomTransform(zoom, dragOffset), opacity: 1 - fade }
}

// Only the photo shown follows the fingers: the others wait whole in their slides.
export function ViewerImage({ photo, isCurrent, gestures, chrome }: ViewerImageProps): JSX.Element {
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the tap toggle is for touch; a keyboard shows the controls with Tab (useViewerChrome).
    <img
      // touch-none: the browser's own pinch and double-tap zoom would enlarge the whole viewer.
      className={cn(
        'h-svh w-full touch-none select-none object-contain',
        !gestures.isActive && 'motion-safe:transition-[transform,opacity] motion-safe:duration-200',
      )}
      style={isCurrent ? imageStyle(gestures) : undefined}
      src={photo.url}
      alt={photoLabel(photo)}
      loading={isCurrent ? 'eager' : 'lazy'}
      decoding="async"
      // The browser's own image drag would steal the mouse from the carousel's swipe.
      draggable={false}
      {...(isCurrent ? gestures.handlers : {})}
      onPointerDownCapture={chrome.onPhotoPointerDown}
      onClick={() => {
        if (!gestures.consumeClick()) chrome.onPhotoClick()
      }}
    />
  )
}
