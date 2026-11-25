import type { MouseEvent, PointerEvent } from 'react'
import { CLOSE_DRAG_DISTANCE_PX } from '@/hooks/useDragToClose.ts'
import {
  type Box,
  isZoomed,
  NO_ZOOM,
  type Point,
  pannedBy,
  type Zoom,
  zoomedAt,
} from '@/photoZoom.ts'

const DOUBLE_TAP_MS = 300
const DOUBLE_TAP_DISTANCE_PX = 30
const DOUBLE_TAP_SCALE = 2.5
// A finger travels this far before we tell a drag down from the carousel's sideways swipe.
const DIRECTION_SLOP_PX = 10

// Client coordinates (clientX, clientY), as the pointer events give them.
type ClientPoint = Point

// pending: one finger down, not yet told a drag down from a swipe.
type Gesture =
  | { kind: 'idle' }
  | { kind: 'pending' | 'drag'; start: ClientPoint }
  | { kind: 'pan'; last: ClientPoint }
  | { kind: 'pinch'; startZoom: Zoom; startDistance: number; startMidpoint: ClientPoint }

// The photo's box: its slide, which the zoom does not transform.
type Frame = { centre: ClientPoint; box: Box }

export type GestureCallbacks = {
  readZoom: () => Zoom
  setZoom: (zoom: Zoom) => void
  setDragOffset: (offset: number) => void
  // true while a finger moves the photo: it follows without easing.
  setIsActive: (isActive: boolean) => void
  onClose: () => void
}

export type GestureState = {
  pointers: Map<number, ClientPoint>
  gesture: Gesture
  frame: Frame
  pointerType: string
  lastTap: { time: number; point: ClientPoint } | null
  // A click that ends a pan, a drag or a pinch is not a tap.
  didMove: boolean
}

// The window until a pointer gives the photo's real box: the keys zoom before any touch.
export function createGestureState(): GestureState {
  const box = { width: window.innerWidth, height: window.innerHeight }
  const centre = { x: box.width / 2, y: box.height / 2 }
  return {
    pointers: new Map(),
    gesture: { kind: 'idle' },
    frame: { centre, box },
    pointerType: 'mouse',
    lastTap: null,
    didMove: false,
  }
}

function frameOf(element: HTMLElement): Frame {
  const rect = (element.parentElement ?? element).getBoundingClientRect()
  const centre = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
  return { centre, box: { width: rect.width, height: rect.height } }
}

function clientPoint(event: MouseEvent): ClientPoint {
  return { x: event.clientX, y: event.clientY }
}

function fromCentre(point: ClientPoint, { centre }: Frame): Point {
  return { x: point.x - centre.x, y: point.y - centre.y }
}

function distance(first: ClientPoint, second: ClientPoint): number {
  return Math.hypot(first.x - second.x, first.y - second.y)
}

function midpoint(first: ClientPoint, second: ClientPoint): ClientPoint {
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 }
}

// A third finger changes nothing: the first two pinch.
function gestureFor(state: GestureState, zoom: Zoom): Gesture {
  const [first, second] = [...state.pointers.values()]
  if (first === undefined) return { kind: 'idle' }
  if (second !== undefined) {
    const startMidpoint = midpoint(first, second)
    return { kind: 'pinch', startZoom: zoom, startDistance: distance(first, second), startMidpoint }
  }
  if (isZoomed(zoom)) return { kind: 'pan', last: first }
  // The mouse swipes with the carousel and closes with ✕: only a finger drags the photo down.
  if (state.pointerType !== 'touch') return { kind: 'idle' }
  return { kind: 'pending', start: first }
}

export function pressPointer(
  state: GestureState,
  callbacks: GestureCallbacks,
  event: PointerEvent<HTMLElement>,
): void {
  if (state.pointers.size === 0) state.didMove = false
  state.frame = frameOf(event.currentTarget)
  state.pointerType = event.pointerType
  // Captured: the gesture goes on when a finger slides off the photo.
  event.currentTarget.setPointerCapture(event.pointerId)
  state.pointers.set(event.pointerId, clientPoint(event))
  state.gesture = gestureFor(state, callbacks.readZoom())
}

function pinch(state: GestureState, callbacks: GestureCallbacks): void {
  const { gesture, frame } = state
  const [first, second] = [...state.pointers.values()]
  if (gesture.kind !== 'pinch' || first === undefined || second === undefined) return
  const scale = (gesture.startZoom.scale * distance(first, second)) / gesture.startDistance
  const anchor = fromCentre(gesture.startMidpoint, frame)
  const zoomed = zoomedAt(gesture.startZoom, scale, anchor, frame.box)
  // Both fingers moving together also slide the photo.
  const currentMidpoint = midpoint(first, second)
  const shift = {
    x: currentMidpoint.x - gesture.startMidpoint.x,
    y: currentMidpoint.y - gesture.startMidpoint.y,
  }
  callbacks.setZoom(pannedBy(zoomed, shift, frame.box))
}

// Sideways or upwards, the finger belongs to the carousel's swipe.
function dragDown(state: GestureState, callbacks: GestureCallbacks, point: ClientPoint): void {
  const { gesture } = state
  if (gesture.kind !== 'pending' && gesture.kind !== 'drag') return
  const deltaX = point.x - gesture.start.x
  const deltaY = point.y - gesture.start.y
  if (gesture.kind === 'pending') {
    if (Math.hypot(deltaX, deltaY) < DIRECTION_SLOP_PX) return
    const isDown = deltaY > Math.abs(deltaX)
    state.gesture = isDown ? { kind: 'drag', start: gesture.start } : { kind: 'idle' }
    return
  }
  callbacks.setDragOffset(Math.max(0, deltaY))
}

function pan(state: GestureState, callbacks: GestureCallbacks, point: ClientPoint): void {
  const { gesture } = state
  if (gesture.kind !== 'pan') return
  const delta = { x: point.x - gesture.last.x, y: point.y - gesture.last.y }
  gesture.last = point
  callbacks.setZoom(pannedBy(callbacks.readZoom(), delta, state.frame.box))
}

export function movePointer(
  state: GestureState,
  callbacks: GestureCallbacks,
  event: PointerEvent<HTMLElement>,
): void {
  if (!state.pointers.has(event.pointerId)) return
  const point = clientPoint(event)
  state.pointers.set(event.pointerId, point)
  const { kind } = state.gesture
  if (kind === 'pinch') pinch(state, callbacks)
  if (kind === 'pan') pan(state, callbacks, point)
  if (kind === 'pending' || kind === 'drag') dragDown(state, callbacks, point)
  if (state.gesture.kind === 'pending' || state.gesture.kind === 'idle') return
  state.didMove = true
  callbacks.setIsActive(true)
}

export function toggleZoomAt(
  state: GestureState,
  callbacks: GestureCallbacks,
  point: ClientPoint,
): void {
  const zoom = callbacks.readZoom()
  const anchor = fromCentre(point, state.frame)
  callbacks.setZoom(
    isZoomed(zoom) ? NO_ZOOM : zoomedAt(zoom, DOUBLE_TAP_SCALE, anchor, state.frame.box),
  )
}

// A mouse double-click; a finger's double tap goes through noteTap instead.
export function doubleClickPhoto(
  state: GestureState,
  callbacks: GestureCallbacks,
  event: MouseEvent<HTMLElement>,
): void {
  if (state.pointerType !== 'mouse') return
  state.frame = frameOf(event.currentTarget)
  toggleZoomAt(state, callbacks, clientPoint(event))
}

// Two taps close in time and place: the browser's own double-tap zoom is off on the photo.
function noteTap(
  state: GestureState,
  callbacks: GestureCallbacks,
  point: ClientPoint,
  time: number,
): void {
  const { lastTap } = state
  const isDoubleTap =
    lastTap !== null &&
    time - lastTap.time < DOUBLE_TAP_MS &&
    distance(lastTap.point, point) < DOUBLE_TAP_DISTANCE_PX
  state.lastTap = isDoubleTap ? null : { time, point }
  if (isDoubleTap) toggleZoomAt(state, callbacks, point)
}

// The pointers left go on with a gesture of their own: a pinch that loses a finger pans.
function continueWithRemainingPointers(state: GestureState, callbacks: GestureCallbacks): void {
  state.gesture = gestureFor(state, callbacks.readZoom())
  if (state.pointers.size === 0) callbacks.setIsActive(false)
}

export function releasePointer(
  state: GestureState,
  callbacks: GestureCallbacks,
  event: PointerEvent<HTMLElement>,
): void {
  const { gesture } = state
  if (!state.pointers.delete(event.pointerId)) return
  const point = clientPoint(event)
  if (gesture.kind === 'pending') noteTap(state, callbacks, point, event.timeStamp)
  if (gesture.kind === 'drag') {
    // Closing keeps the offset: the photo leaves from where the finger let go.
    if (point.y - gesture.start.y > CLOSE_DRAG_DISTANCE_PX) callbacks.onClose()
    else callbacks.setDragOffset(0)
  }
  continueWithRemainingPointers(state, callbacks)
}

// The browser took the pointer back (a system gesture, a call): what it was doing is dropped.
export function cancelPointer(
  state: GestureState,
  callbacks: GestureCallbacks,
  event: PointerEvent<HTMLElement>,
): void {
  if (!state.pointers.delete(event.pointerId)) return
  callbacks.setDragOffset(0)
  continueWithRemainingPointers(state, callbacks)
}
