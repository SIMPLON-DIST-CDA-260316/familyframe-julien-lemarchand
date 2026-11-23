import type { JSX, ReactNode } from 'react'
import { cn } from '@/lib/utils.ts'

type FrameControlsProps = {
  isVisible: boolean
  children: ReactNode
}

export function FrameControls({ isVisible, children }: FrameControlsProps): JSX.Element {
  return (
    <div
      // Kept mounted so the hide can animate; inert keeps hidden buttons out of focus and clicks.
      inert={!isVisible}
      className={cn(
        'fixed top-6 right-6 flex items-center gap-1 rounded-full bg-black/45 p-1.5 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl',
        'transition-[opacity,translate] ease-out motion-reduce:transition-none',
        // Leaving is faster than arriving, so the photo comes back quickly.
        isVisible
          ? 'opacity-100 duration-300'
          : 'pointer-events-none -translate-y-3 opacity-0 duration-200',
      )}
    >
      {children}
    </div>
  )
}
