import { type PointerEvent, useState } from 'react'

// Released past this distance, a dragged sheet or photo closes; short of it, it springs back.
export const CLOSE_DRAG_DISTANCE_PX = 100

type DragHandlers = {
  onPointerDown: (event: PointerEvent<HTMLElement>) => void
  onPointerMove: (event: PointerEvent<HTMLElement>) => void
  onPointerUp: (event: PointerEvent<HTMLElement>) => void
  onPointerCancel: () => void
}

export type DragToClose = {
  // How far down the sheet follows the pointer, in px.
  offset: number
  isDragging: boolean
  handlers: DragHandlers
}

// Only downwards: pulling a sheet up has nowhere to go. A closing sheet keeps its offset, so it
// leaves from where the finger let go.
export function useDragToClose(onClose: () => void): DragToClose {
  const [startY, setStartY] = useState<number | null>(null)
  const [offset, setOffset] = useState(0)
  const cancel = (): void => {
    setStartY(null)
    setOffset(0)
  }
  const handlers: DragHandlers = {
    onPointerDown: (event) => {
      // Captured: the sheet keeps following a finger that slides off the handle.
      event.currentTarget.setPointerCapture(event.pointerId)
      setStartY(event.clientY)
    },
    onPointerMove: (event) => {
      if (startY !== null) setOffset(Math.max(0, event.clientY - startY))
    },
    onPointerUp: () => {
      if (offset <= CLOSE_DRAG_DISTANCE_PX) return cancel()
      setStartY(null)
      onClose()
    },
    onPointerCancel: cancel,
  }
  return { offset, isDragging: startY !== null, handlers }
}
