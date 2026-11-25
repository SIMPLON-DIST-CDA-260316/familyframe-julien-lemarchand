// A 20×30 cm print at 300 dpi needs 3543 px on its long side: 4096 px keeps a margin.
const MAX_LONG_SIDE = 4096
// The server's MAX_FILE_SIZE (photos.upload.ts): a heavier file is refused.
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

export type ResizeDecision =
  | { shouldResize: false }
  | { shouldResize: true; width: number; height: number }

// Pure, so the rule reads on its own: only too large or too heavy photos are redrawn, never
// enlarged. Too heavy but small enough keeps its size: the JPEG encoding alone makes it lighter.
export function resizeDecision(width: number, height: number, byteSize: number): ResizeDecision {
  const longSide = Math.max(width, height)
  if (longSide <= MAX_LONG_SIDE && byteSize <= MAX_UPLOAD_BYTES) return { shouldResize: false }
  const scale = Math.min(1, MAX_LONG_SIDE / longSide)
  return {
    shouldResize: true,
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  }
}
