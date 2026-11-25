import { isPhotoSource, LIBRARY_SOURCE, type PhotoSource } from '@/photoSource.ts'

export type FrameTemplate = 'fit' | 'fill' | 'mat' | 'polaroid'
export type PlaybackOrder = 'newest' | 'shuffle'

export type FrameSettings = {
  template: FrameTemplate
  order: PlaybackOrder
  intervalMs: number
  source: PhotoSource
}

export const SLIDESHOW_INTERVALS_MS = [5_000, 10_000, 20_000]
const FRAME_TEMPLATES: FrameTemplate[] = ['fit', 'fill', 'mat', 'polaroid']
const PLAYBACK_ORDERS: PlaybackOrder[] = ['newest', 'shuffle']

export const DEFAULT_FRAME_SETTINGS: FrameSettings = {
  template: 'fit',
  order: 'newest',
  intervalMs: 10_000,
  source: LIBRARY_SOURCE,
}

export const FRAME_SETTINGS_KEY = 'familyframe.frame-settings'

function isFrameTemplate(value: unknown): value is FrameTemplate {
  return FRAME_TEMPLATES.some((template) => template === value)
}

function isPlaybackOrder(value: unknown): value is PlaybackOrder {
  return PLAYBACK_ORDERS.some((order) => order === value)
}

function isSlideshowInterval(value: unknown): value is number {
  return SLIDESHOW_INTERVALS_MS.some((intervalMs) => intervalMs === value)
}

// Each value is checked on its own: one edited by hand or left by an older version falls back to
// its default without dropping the others.
export function parseFrameSettings(raw: unknown): FrameSettings {
  if (typeof raw !== 'object' || raw === null) return DEFAULT_FRAME_SETTINGS
  return {
    template:
      'template' in raw && isFrameTemplate(raw.template)
        ? raw.template
        : DEFAULT_FRAME_SETTINGS.template,
    order: 'order' in raw && isPlaybackOrder(raw.order) ? raw.order : DEFAULT_FRAME_SETTINGS.order,
    intervalMs:
      'intervalMs' in raw && isSlideshowInterval(raw.intervalMs)
        ? raw.intervalMs
        : DEFAULT_FRAME_SETTINGS.intervalMs,
    source:
      'source' in raw && isPhotoSource(raw.source) ? raw.source : DEFAULT_FRAME_SETTINGS.source,
  }
}

// localStorage throws when the browser blocks site data, JSON.parse on a value that is not JSON:
// either way the frame still shows, with the defaults.
export function readFrameSettings(): FrameSettings {
  try {
    const stored = localStorage.getItem(FRAME_SETTINGS_KEY)
    return stored === null ? DEFAULT_FRAME_SETTINGS : parseFrameSettings(JSON.parse(stored))
  } catch (_error: unknown) {
    return DEFAULT_FRAME_SETTINGS
  }
}

export function writeFrameSettings(settings: FrameSettings): void {
  try {
    localStorage.setItem(FRAME_SETTINGS_KEY, JSON.stringify(settings))
  } catch (_error: unknown) {
    // Not remembered on this device: the choice holds until the page closes.
  }
}
