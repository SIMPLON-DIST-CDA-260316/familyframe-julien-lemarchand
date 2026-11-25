import { GLASS_BUTTON_CLASSES } from '@/components/frame/controlClasses.ts'
import { cn } from '@/lib/utils.ts'

// The frame's glass, smaller: a viewer on a computer screen does not need wall-sized buttons.
// Kept mounted so hiding can fade. Leaving is faster than arriving: the photo comes back quickly.
export function chromeClasses(isVisible: boolean): string {
  return cn(
    'transition-opacity ease-out motion-reduce:transition-none',
    isVisible ? 'opacity-100 duration-300' : 'opacity-0 duration-200',
  )
}

// The Button's own coarse size still gives a finger 44 px.
export const VIEWER_BUTTON_CLASSES = cn(GLASS_BUTTON_CLASSES, 'size-9')
