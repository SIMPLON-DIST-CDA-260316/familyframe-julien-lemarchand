import {
  COARSE_POINTER_TARGET_CLASSES,
  GLASS_BUTTON_CLASSES,
} from '@/components/frame/controlClasses.ts'
import { cn } from '@/lib/utils.ts'

// The frame's glass, smaller: a viewer on a computer screen does not need wall-sized buttons.
export const VIEWER_BUTTON_CLASSES = cn(
  GLASS_BUTTON_CLASSES,
  'size-9',
  COARSE_POINTER_TARGET_CLASSES,
)
