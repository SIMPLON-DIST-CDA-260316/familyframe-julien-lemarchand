// A 20×30 cm print at 300 dpi needs 3543 px on its long side: 4096 px keeps a margin.
const MAX_LONG_SIDE = 4096
// The server's MAX_FILE_SIZE (photos.upload.ts): a heavier file is refused.
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

export type ResizeDecision =
  | { shouldResize: false }
  | { shouldResize: true; width: number; height: number }

// The decoded photo, and whether the browser turned it the right way up (imageOrientation).
export type DecodedSize = { width: number; height: number; isUpright: boolean }

// Pure, so the rule reads on its own: only too large or too heavy photos are redrawn, never
// enlarged. Too heavy but small enough keeps its size: the JPEG encoding alone makes it lighter.
// Not upright, a redrawn photo could lie on its side: the original goes whenever the server takes
// it, since the server turns it from its EXIF.
export function resizeDecision(
  { width, height, isUpright }: DecodedSize,
  byteSize: number,
): ResizeDecision {
  if (!isUpright && byteSize <= MAX_UPLOAD_BYTES) return { shouldResize: false }
  const longSide = Math.max(width, height)
  if (longSide <= MAX_LONG_SIDE && byteSize <= MAX_UPLOAD_BYTES) return { shouldResize: false }
  const scale = Math.min(1, MAX_LONG_SIDE / longSide)
  return {
    shouldResize: true,
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  }
}
