import type { JSX, ReactNode } from 'react'
import { cn } from '@/lib/utils.ts'

type ControlsBarEdge = 'top' | 'bottom'

// Each bar slides off towards the edge it sits on.
const HIDDEN_SHIFT_CLASSES: Record<ControlsBarEdge, string> = {
  top: '-translate-y-3',
  bottom: 'translate-y-3',
}

type ControlsBarProps = {
  edge: ControlsBarEdge
  isVisible: boolean
  // Where the bar sits and how it lays out its buttons.
  className: string
  children: ReactNode
}

export function ControlsBar({
  edge,
  isVisible,
  className,
  children,
}: ControlsBarProps): JSX.Element {
  return (
    <div
      // Kept mounted so the hide can animate; inert keeps hidden buttons out of focus and clicks.
      inert={!isVisible}
      className={cn(
        // The row spans the screen: only its buttons take pointers, swipes beside them reach the carousel.
        'pointer-events-none flex items-center px-6 py-4 transition-[opacity,translate] ease-out motion-reduce:transition-none',
        // Leaving is faster than arriving, so the photo comes back quickly.
        isVisible
          ? 'opacity-100 duration-300 *:pointer-events-auto'
          : cn('opacity-0 duration-200', HIDDEN_SHIFT_CLASSES[edge]),
        className,
      )}
    >
      {children}
    </div>
  )
}
