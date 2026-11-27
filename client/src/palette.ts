import { syncThemeColor } from './themeColor.ts'

export type Palette = 'encre' | 'actuelle'

const DEFAULT_PALETTE: Palette = 'encre'
const STORAGE_KEY = 'familyframe-palette'

export function isPalette(value: unknown): value is Palette {
  return value === 'encre' || value === 'actuelle'
}

// Private browsing or blocked site data can make localStorage throw: the default stands in.
export function readPalette(): Palette {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isPalette(stored) ? stored : DEFAULT_PALETTE
  } catch (_error: unknown) {
    return DEFAULT_PALETTE
  }
}

// index.css switches palette on this attribute, independently of the theme's `.dark` class.
function applyPalette(palette: Palette): void {
  document.documentElement.dataset.palette = palette
  syncThemeColor()
}

export function savePalette(palette: Palette): void {
  try {
    localStorage.setItem(STORAGE_KEY, palette)
  } catch (_error: unknown) {
    // Not remembered for the next visit, but still applied below.
  }
  applyPalette(palette)
}

export function initPalette(): void {
  applyPalette(readPalette())
}
