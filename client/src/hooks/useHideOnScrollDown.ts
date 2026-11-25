import { type RefObject, useEffect, useRef, useState } from 'react'

// Smaller moves are a finger resting on the screen, not a scroll: the button would flicker.
const SCROLL_THRESHOLD_PX = 12
// At the end of the list the page's bottom padding keeps the button clear of the last row.
const END_MARGIN_PX = 48

export type HideOnScrollDown = {
  isHidden: boolean
  ref: RefObject<HTMLButtonElement | null>
  onFocus: () => void
}

function isAtPageEnd(): boolean {
  const scrolledTo = window.innerHeight + window.scrollY
  return scrolledTo >= document.documentElement.scrollHeight - END_MARGIN_PX
}

// Keyboard focus keeps the button shown. Focus left by a tap or a closing panel is dropped
// instead: a hidden button must not hold it.
function keepsKeyboardFocus(button: HTMLButtonElement | null): boolean {
  if (button === null || document.activeElement !== button) return false
  if (button.matches(':focus-visible')) return true
  button.blur()
  return false
}

// A floating button covers what scrolls under it: it steps aside while the page goes down and
// comes back when it goes up, at the top, at the end, or when the keyboard reaches it.
export function useHideOnScrollDown(): HideOnScrollDown {
  const [isHidden, setIsHidden] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let lastY = window.scrollY
    function handleScroll(): void {
      const y = window.scrollY
      if (Math.abs(y - lastY) < SCROLL_THRESHOLD_PX) return
      const isGoingDown = y > lastY
      lastY = y
      // y <= 0: the top, iOS bounces below it.
      if (!isGoingDown || y <= 0 || isAtPageEnd()) setIsHidden(false)
      else if (!keepsKeyboardFocus(ref.current)) setIsHidden(true)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return { isHidden, ref, onFocus: () => setIsHidden(false) }
}
