import type { ComponentProps, JSX } from 'react'
import { Button } from '@/components/ui/button.tsx'
import { cn } from '@/lib/utils.ts'

// page: on the page's own background (a list row, a title, a history line). photo: over a photo,
// where only a dark pill stays legible whatever the picture and the theme.
export type IconButtonSurface = 'page' | 'photo'

// One circle everywhere, 32 px under a mouse and a finger alike: the button looks the same on every
// device. A finger gets its 44 px (WCAG 2.5.5) from an invisible `after`, 6 px wider on each side.
const SHAPE_CLASSES =
  'relative size-8 rounded-full pointer-coarse:size-8 pointer-coarse:after:absolute pointer-coarse:after:-inset-1.5'

const SURFACE_CLASSES: Record<IconButtonSurface, string> = {
  page: 'text-muted-foreground',
  photo:
    'bg-overlay text-on-overlay-muted backdrop-blur-sm hover:bg-overlay-strong hover:text-on-overlay aria-expanded:bg-overlay-strong aria-expanded:text-on-overlay dark:hover:bg-overlay-strong',
}

type IconButtonProps = Omit<ComponentProps<typeof Button>, 'variant' | 'size'> & {
  surface: IconButtonSurface
  // Required: the icon alone says nothing to a screen reader.
  'aria-label': string
}

// className places the button (absolute, a corner); its look comes from the surface only.
export function IconButton({ surface, className, ...props }: IconButtonProps): JSX.Element {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(SHAPE_CLASSES, SURFACE_CLASSES[surface], className)}
      {...props}
    />
  )
}
