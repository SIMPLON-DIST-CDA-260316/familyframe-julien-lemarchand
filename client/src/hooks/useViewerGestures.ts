import { type MouseEvent, type PointerEvent, useEffect, useRef, useState } from 'react'
import {
  cancelPointer,
  createGestureState,
  doubleClickPhoto,
  type GestureCallbacks,
  movePointer,
  pressPointer,
  releasePointer,
} from '@/photoGestures.ts'
import { isZoomed, NO_ZOOM, type Zoom, zoomedAt } from '@/photoZoom.ts'

type PointerHandler = (event: PointerEvent<HTMLElement>) => void

export type PhotoGestureHandlers = {
  onPointerDown: PointerHandler
  onPointerMove: PointerHandler
  onPointerUp: PointerHandler
  onPointerCancel: PointerHandler
  onDoubleClick: (event: MouseEvent<HTMLElement>) => void
}

export type ViewerGestures = {
  zoom: Zoom
  // How far down a finger pulls the photo towards closing, in px.
  dragOffset: number
  // true while a finger moves the photo: it follows without easing.
  isActive: boolean
  handlers: PhotoGestureHandlers
  isZoomed: boolean
  // The keys and buttons zoom around the centre: × factor, below 1 to zoom out.
  zoomByStep: (factor: number) => void
  // true when the click ends a pan, a drag or a pinch: it is not a tap on the photo.
  consumeClick: () => boolean
}

type ViewerGesturesOptions = { photoId: string; onClose: () => void }

// The zoom belongs to one photo: another photo, by arrow or swipe, starts whole.
function usePhotoZoom(photoId: string): [Zoom, (zoom: Zoom) => void, () => Zoom] {
  const [stored, setStored] = useState({ photoId, zoom: NO_ZOOM })
  const zoom = stored.photoId === photoId ? stored.zoom : NO_ZOOM
  // Several pointer moves can come before the next render: they read the latest zoom here.
  const zoomRef = useRef(zoom)
  useEffect(() => {
    zoomRef.current = zoom
  }, [zoom])
  const setZoom = (next: Zoom): void => {
    zoomRef.current = next
    setStored({ photoId, zoom: next })
  }
  return [zoom, setZoom, () => zoomRef.current]
}

// Pointer events rather than touch events: the same code serves a finger, a pen and a mouse.
export function useViewerGestures({ photoId, onClose }: ViewerGesturesOptions): ViewerGestures {
  const [zoom, setZoom, readZoom] = usePhotoZoom(photoId)
  const [dragOffset, setDragOffset] = useState(0)
  const [isActive, setIsActive] = useState(false)
  // Mutable and never rendered: the pointers down and what they are doing.
  const [state] = useState(createGestureState)
  const callbacks: GestureCallbacks = { readZoom, setZoom, setDragOffset, setIsActive, onClose }

  return {
    zoom,
    dragOffset,
    isActive,
    handlers: {
      onPointerDown: (event) => pressPointer(state, callbacks, event),
      onPointerMove: (event) => movePointer(state, callbacks, event),
      onPointerUp: (event) => releasePointer(state, callbacks, event),
      onPointerCancel: (event) => cancelPointer(state, callbacks, event),
      onDoubleClick: (event) => doubleClickPhoto(state, callbacks, event),
    },
    isZoomed: isZoomed(zoom),
    zoomByStep: (factor) => {
      const current = readZoom()
      setZoom(zoomedAt(current, current.scale * factor, { x: 0, y: 0 }, state.frame.box))
    },
    consumeClick: () => {
      const didMove = state.didMove
      state.didMove = false
      return didMove
    },
  }
}
