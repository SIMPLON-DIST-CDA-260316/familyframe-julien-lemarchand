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
        'fixed top-4 right-4 flex items-center gap-2 rounded-lg bg-background/80 p-1 backdrop-blur',
        'transition-[opacity,translate] duration-300 ease-out motion-reduce:transition-none',
        isVisible ? 'opacity-100' : 'pointer-events-none -translate-y-2 opacity-0',
      )}
    >
      {children}
    </div>
  )
}
