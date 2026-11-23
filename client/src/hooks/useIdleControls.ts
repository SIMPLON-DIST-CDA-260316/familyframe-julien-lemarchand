import { useEffect, useState } from 'react'

const CONTROLS_HIDE_DELAY_MS = 4000
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = ['pointermove', 'pointerdown', 'keydown']

// Someone reading the actions menu or the delete dialog is still using the frame, even
// without moving: the slideshow must not change the photo behind it.
function isOverlayOpen(): boolean {
  return document.querySelector('[role="menu"], [role="alertdialog"]') !== null
}

export function useIdleControls(): boolean {
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    let hideTimer: number | undefined

    function hideUnlessOverlay(): void {
      if (isOverlayOpen()) {
        hideTimer = window.setTimeout(hideUnlessOverlay, CONTROLS_HIDE_DELAY_MS)
        return
      }
      setIsActive(false)
    }

    function showControls(): void {
      setIsActive(true)
      window.clearTimeout(hideTimer)
      hideTimer = window.setTimeout(hideUnlessOverlay, CONTROLS_HIDE_DELAY_MS)
    }

    for (const eventName of ACTIVITY_EVENTS) window.addEventListener(eventName, showControls)
    return () => {
      window.clearTimeout(hideTimer)
      for (const eventName of ACTIVITY_EVENTS) window.removeEventListener(eventName, showControls)
    }
  }, [])

  return isActive
}
