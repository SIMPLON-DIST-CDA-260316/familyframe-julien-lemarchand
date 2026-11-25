import { type PointerEvent, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { isOverlayOpen } from '@/hooks/useIdle.ts'

const HIDE_DELAY_MS = 3000
const CONTROLS_SELECTOR = '[data-viewer-controls]'

export type ViewerChrome = {
  isVisible: boolean
  onPhotoPointerDown: (event: PointerEvent) => void
  onPhotoClick: () => void
}

// Someone pointing at a button, tabbing through them or reading a menu is still using the
// controls: they must not vanish under them.
function isUsingControls(): boolean {
  if (isOverlayOpen()) return true
  return Array.from(document.querySelectorAll(CONTROLS_SELECTOR)).some(
    (controls) => controls.matches(':hover') || controls.querySelector(':focus-visible') !== null,
  )
}

// A hidden control is inert: focus left on it would drop out of the viewer, onto the page.
function moveFocusOffControls(): void {
  if (!document.activeElement?.closest(CONTROLS_SELECTOR)) return
  document.querySelector<HTMLElement>('[data-photo-viewer]')?.focus()
}

type HideTimer = { restart: () => void; clear: () => void }

// Controls in use when the delay ends wait one more delay.
function createHideTimer(setIsVisible: (isVisible: boolean) => void): HideTimer {
  let hideTimer = 0
  function hideUnlessInUse(): void {
    if (isUsingControls()) {
      restart()
      return
    }
    moveFocusOffControls()
    setIsVisible(false)
  }
  function restart(): void {
    window.clearTimeout(hideTimer)
    hideTimer = window.setTimeout(hideUnlessInUse, HIDE_DELAY_MS)
  }
  return { restart, clear: () => window.clearTimeout(hideTimer) }
}

// A plain function the effect wires up; it returns its cleanup.
function watchActivity(setIsVisible: (isVisible: boolean) => void): () => void {
  const hideTimer = createHideTimer(setIsVisible)
  function handlePointerMove(event: globalThis.PointerEvent): void {
    // A finger only moves to swipe: the controls stay as they are.
    if (event.pointerType !== 'mouse') return
    setIsVisible(true)
    hideTimer.restart()
  }
  function handleKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return
    // Synchronous, and in the capture phase: the controls lose inert before Tab moves the focus.
    flushSync(() => setIsVisible(true))
    hideTimer.restart()
  }
  // A mouse may never move again: its controls still step aside. A finger waits for a tap.
  if (window.matchMedia('(pointer: fine)').matches) hideTimer.restart()
  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('keydown', handleKeyDown, true)
  return () => {
    hideTimer.clear()
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('keydown', handleKeyDown, true)
  }
}

// The photo first: controls show on mouse movement or Tab and step aside after a pause; on a
// touch screen a tap on the photo toggles them. Embla swallows the click that ends a swipe, so
// onPhotoClick only ever sees taps.
export function useViewerChrome(): ViewerChrome {
  const [isVisible, setIsVisible] = useState(true)
  // Read on pointerdown: Safari's click event carries no pointer type.
  const pointerTypeRef = useRef('mouse')

  useEffect(() => watchActivity(setIsVisible), [])

  return {
    isVisible,
    onPhotoPointerDown: (event) => {
      pointerTypeRef.current = event.pointerType
    },
    // A mouse click on the photo would hide what the mouse movement just showed.
    onPhotoClick: () => {
      if (pointerTypeRef.current !== 'mouse') setIsVisible((wasVisible) => !wasVisible)
    },
  }
}
