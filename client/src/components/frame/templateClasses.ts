import type { FrameTemplate } from '@/frameSettings.ts'

// The dark wall a mat or a print hangs on, lit softly from the middle.
const WALL_CLASSES = 'grid h-svh place-items-center bg-radial from-white/6 to-transparent to-75%'

export const SLIDE_CLASSES: Record<FrameTemplate, string> = {
  fit: '',
  fill: '',
  mat: WALL_CLASSES,
  polaroid: WALL_CLASSES,
}

// The vmin sizes keep the same proportions on a phone and on a TV. Each max size is the screen
// minus what the template puts around the photo: wall margin, mat, print border and band.
export const IMAGE_CLASSES: Record<FrameTemplate, string> = {
  fit: 'h-svh w-full object-contain drop-shadow-2xl',
  fill: 'h-svh w-full object-cover',
  // The white ring is the bevel cut into the mat.
  mat: 'block max-h-[calc(100svh_-_26vmin)] max-w-[calc(100vw_-_26vmin)] object-contain ring-[3px] ring-white/90',
  polaroid: 'block max-h-[calc(100svh_-_30vmin)] max-w-[calc(100vw_-_16vmin)] object-contain',
}

export const MAT_CLASSES = 'bg-frame-mat p-[8vmin] shadow-2xl shadow-black/60'

// A print zooming inside its mat looks broken: the mat and the polaroid are still frames.
export function hasKenBurns(template: FrameTemplate): boolean {
  return template === 'fit' || template === 'fill'
}

// Only Ajusté leaves bars around the photo for its blurred copy to fill.
export function hasBackdrop(template: FrameTemplate): boolean {
  return template === 'fit'
}

// The polaroid writes the date and the sender in its own band.
export function hasCaptionOverlay(template: FrameTemplate): boolean {
  return template !== 'polaroid'
}
