import { MaximizeIcon } from 'lucide-react'
import type { JSX } from 'react'
import { GLASS_BUTTON_CLASSES } from '@/components/frame/controlClasses.ts'
import { Button } from '@/components/ui/button.tsx'
import { enterFullscreen, isFullscreenAvailable } from '@/fullscreen.ts'
import { useIsFullscreen } from '@/hooks/useIsFullscreen.ts'

// A frame that starts on /frame by itself had no click to go full screen with: one tap does it.
export function FullscreenButton(): JSX.Element | null {
  const isFullscreenOn = useIsFullscreen()
  if (!isFullscreenAvailable() || isFullscreenOn) return null

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={enterFullscreen}
      aria-label="Plein écran"
      title="Plein écran"
      className={GLASS_BUTTON_CLASSES}
    >
      <MaximizeIcon />
    </Button>
  )
}
