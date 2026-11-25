import { syncThemeColor } from './themeColor.ts'

export type ThemePreference = 'light' | 'dark' | 'system'

const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)'
const STORAGE_KEY = 'familyframe-theme'

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system'
}

// Private browsing or blocked site data can make localStorage throw: the system theme stands in.
export function readThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isThemePreference(stored) ? stored : 'system'
  } catch (_error: unknown) {
    return 'system'
  }
}

// The shadcn theme switches on a `.dark` class, not on the media query.
function applyTheme(preference: ThemePreference): void {
  const isDark =
    preference === 'dark' ||
    (preference === 'system' && window.matchMedia(DARK_SCHEME_QUERY).matches)
  document.documentElement.classList.toggle('dark', isDark)
  syncThemeColor()
}

export function saveThemePreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, preference)
  } catch (_error: unknown) {
    // Not remembered for the next visit, but still applied below.
  }
  applyTheme(preference)
}

export function initTheme(): void {
  applyTheme(readThemePreference())
  // Read the choice again: it may have left "system" since the page loaded.
  window
    .matchMedia(DARK_SCHEME_QUERY)
    .addEventListener('change', () => applyTheme(readThemePreference()))
}
