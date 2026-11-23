import { type RefObject, useEffect } from 'react'

// Below this, a press that wobbles is still a click on a thumbnail.
const DRAG_THRESHOLD_PX = 5
// Share of the remaining distance covered each frame: quick to start, soft to stop.
const EASING_SHARE = 0.2
// Close enough to the target to stop animating.
const SETTLED_PX = 0.5
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

type StopListening = () => void

type EasedScroll = {
  scrollBy: (distance: number) => void
  stop: () => void
}

type DragState = {
  // null: the mouse button is up.
  pressX: number | null
  pressScrollLeft: number
  hasDragged: boolean
}

// Each call moves a target; the list glides towards it instead of jumping there.
function easeScroll(list: HTMLElement): EasedScroll {
  let targetLeft = 0
  // Kept here, not read back: the browser rounds scrollLeft, which would stall the last small steps.
  let currentLeft = 0
  let frame: number | null = null

  function step(): void {
    const remaining = targetLeft - currentLeft
    currentLeft =
      Math.abs(remaining) < SETTLED_PX ? targetLeft : currentLeft + remaining * EASING_SHARE
    list.scrollLeft = currentLeft
    frame = currentLeft === targetLeft ? null : requestAnimationFrame(step)
  }

  function scrollBy(distance: number): void {
    // Starting afresh: a drag may have moved the list since the last glide.
    if (frame === null) {
      targetLeft = list.scrollLeft
      currentLeft = list.scrollLeft
    }
    const maxLeft = list.scrollWidth - list.clientWidth
    targetLeft = Math.min(maxLeft, Math.max(0, targetLeft + distance))
    if (window.matchMedia(REDUCED_MOTION_QUERY).matches) list.scrollLeft = targetLeft
    else frame ??= requestAnimationFrame(step)
  }

  const stop = (): void => {
    if (frame !== null) cancelAnimationFrame(frame)
    frame = null
  }
  return { scrollBy, stop }
}

function scrollSidewaysWithWheel(list: HTMLElement): StopListening {
  const easedScroll = easeScroll(list)
  function handleWheel(event: WheelEvent): void {
    // A plain wheel turns vertically: the strip only goes sideways.
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
    event.preventDefault()
    easedScroll.scrollBy(event.deltaY)
  }
  list.addEventListener('wheel', handleWheel, { passive: false })
  return () => {
    list.removeEventListener('wheel', handleWheel)
    easedScroll.stop()
  }
}

function followDrag(list: HTMLElement, state: DragState, event: PointerEvent): void {
  if (state.pressX === null) return
  const distance = event.clientX - state.pressX
  if (Math.abs(distance) > DRAG_THRESHOLD_PX) state.hasDragged = true
  if (state.hasDragged) list.scrollLeft = state.pressScrollLeft - distance
}

// The release after a drag must not open the thumbnail it ends on.
function swallowClickAfterDrag(state: DragState, event: MouseEvent): void {
  if (!state.hasDragged) return
  event.preventDefault()
  event.stopPropagation()
  state.hasDragged = false
}

function scrollWithMouseDrag(list: HTMLElement): StopListening {
  const state: DragState = { pressX: null, pressScrollLeft: 0, hasDragged: false }
  const press = (event: PointerEvent): void => {
    // Touch already scrolls the list natively.
    if (event.pointerType !== 'mouse' || event.button !== 0) return
    state.pressX = event.clientX
    state.pressScrollLeft = list.scrollLeft
    state.hasDragged = false
  }
  const move = (event: PointerEvent): void => followDrag(list, state, event)
  const release = (): void => {
    state.pressX = null
  }
  const click = (event: MouseEvent): void => swallowClickAfterDrag(state, event)

  list.addEventListener('pointerdown', press)
  // On window: the drag goes on when the mouse leaves the strip.
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', release)
  list.addEventListener('click', click, { capture: true })
  return () => {
    list.removeEventListener('pointerdown', press)
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', release)
    list.removeEventListener('click', click, { capture: true })
  }
}

// A finger already scrolls a horizontal list; a mouse needs the wheel and a drag to do the same.
export function useDragScroll(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const list = ref.current
    if (!list) return
    const stopWheel = scrollSidewaysWithWheel(list)
    const stopDrag = scrollWithMouseDrag(list)
    return () => {
      stopWheel()
      stopDrag()
    }
  }, [ref])
}
