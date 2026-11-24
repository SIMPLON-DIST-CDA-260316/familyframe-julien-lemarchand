import { useSyncExternalStore } from 'react'

export type AppliedTheme = 'light' | 'dark'

// theme.ts toggles `.dark` on <html>: watching the class follows every way it changes.
function subscribeToThemeClass(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}

function readAppliedTheme(): AppliedTheme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function useAppliedTheme(): AppliedTheme {
  return useSyncExternalStore(subscribeToThemeClass, readAppliedTheme)
}
