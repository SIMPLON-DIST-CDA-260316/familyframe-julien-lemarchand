import { GLASS_BUTTON_CLASSES } from '@/components/frame/controlClasses.ts'
import { cn } from '@/lib/utils.ts'

// The frame's glass, smaller: a viewer on a computer screen does not need wall-sized buttons.
// The Button's own coarse size still gives a finger 44 px.
export const VIEWER_BUTTON_CLASSES = cn(GLASS_BUTTON_CLASSES, 'size-9')
