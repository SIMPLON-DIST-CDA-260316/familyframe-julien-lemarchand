import { useEffect, useEffectEvent } from 'react'
import { exitFullscreen, isFullscreen } from '@/fullscreen.ts'

// Full screen and frame mode go together. In full screen the browser keeps Escape for itself,
// so the end of full screen is the only sure sign the person wants out: Escape, F11, a gesture.
export function useFrameFullscreen(onExit: () => void): void {
  const exitFrame = useEffectEvent(onExit)

  useEffect(() => {
    function handleFullscreenChange(): void {
      if (!isFullscreen()) exitFrame()
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      // Removed first: the full screen exit below must not leave the frame a second time.
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      // The back button or a link left the frame: the library must not stay full screen.
      exitFullscreen()
    }
  }, [])
}
