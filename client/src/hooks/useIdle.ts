import { useEffect, useState } from 'react'

// wheel: scrolling the library with a mouse wheel moves no pointer, yet someone is using it.
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = ['pointermove', 'pointerdown', 'keydown', 'wheel']

// Someone reading the actions menu, the share or the delete dialog is still using the frame, even
// without moving: the slideshow must not change the photo behind it. The photo viewer is a dialog
// too, but only the layers above it count: its own arrow keys must keep working.
export function isOverlayOpen(): boolean {
  const overlaySelector =
    '[role="menu"], [role="dialog"]:not([data-photo-viewer]), [role="alertdialog"]'
  return document.querySelector(overlaySelector) !== null
}

// Starts active: someone just opened the page, and the library must wait its full delay
// before launching the slideshow.
export function useIdle(delayMs: number): boolean {
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    let idleTimer = window.setTimeout(becomeIdleUnlessOverlay, delayMs)

    function becomeIdleUnlessOverlay(): void {
      if (isOverlayOpen()) {
        idleTimer = window.setTimeout(becomeIdleUnlessOverlay, delayMs)
        return
      }
      setIsActive(false)
    }

    function markActive(): void {
      setIsActive(true)
      window.clearTimeout(idleTimer)
      idleTimer = window.setTimeout(becomeIdleUnlessOverlay, delayMs)
    }

    for (const eventName of ACTIVITY_EVENTS) window.addEventListener(eventName, markActive)
    return () => {
      window.clearTimeout(idleTimer)
      for (const eventName of ACTIVITY_EVENTS) window.removeEventListener(eventName, markActive)
    }
  }, [delayMs])

  return isActive
}
