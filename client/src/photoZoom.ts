// x and y move the photo from its place, in px; scale enlarges it around its centre.
export type Zoom = { scale: number; x: number; y: number }

// A point relative to the centre of the photo's box, in px.
export type Point = { x: number; y: number }

export type Box = { width: number; height: number }

export const NO_ZOOM: Zoom = { scale: 1, x: 0, y: 0 }

const MAX_SCALE = 4

// A pinch that ends this close to 1× was meant to go back to the whole photo.
const SNAP_BACK_SCALE = 1.05

export function isZoomed({ scale }: Zoom): boolean {
  return scale > 1
}

// The enlarged photo keeps covering its box: a pan stops at its edge.
function clampedShift(shift: number, scale: number, size: number): number {
  const limit = ((scale - 1) * size) / 2
  return Math.min(limit, Math.max(-limit, shift))
}

function withinBox({ scale, x, y }: Zoom, box: Box): Zoom {
  return {
    scale,
    x: clampedShift(x, scale, box.width),
    y: clampedShift(y, scale, box.height),
  }
}

// The point under the fingers (or the pointer) stays under them while the scale changes: a
// point at distance d from the centre is drawn at x + scale × d.
export function zoomedAt(zoom: Zoom, scale: number, anchor: Point, box: Box): Zoom {
  const nextScale = Math.min(MAX_SCALE, Math.max(1, scale))
  if (nextScale < SNAP_BACK_SCALE) return NO_ZOOM
  const ratio = nextScale / zoom.scale
  const x = anchor.x - ratio * (anchor.x - zoom.x)
  const y = anchor.y - ratio * (anchor.y - zoom.y)
  return withinBox({ scale: nextScale, x, y }, box)
}

export function pannedBy(zoom: Zoom, delta: Point, box: Box): Zoom {
  return withinBox({ ...zoom, x: zoom.x + delta.x, y: zoom.y + delta.y }, box)
}

export function zoomTransform({ scale, x, y }: Zoom, dragOffset: number): string {
  return `translate(${x}px, ${y + dragOffset}px) scale(${scale})`
}
