import { useEffect } from 'react'
import { isOverlayOpen } from '@/hooks/useIdle.ts'

export function useEscapeToClose(onClose: () => void): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      // An open menu or dialog takes this Escape for itself.
      if (event.key !== 'Escape' || isOverlayOpen()) return
      onClose()
    }

    // Capture: Radix closes its layer on this same Escape, so a later listener would find
    // the menu already gone and close the slideshow with it.
    window.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true })
  }, [onClose])
}
