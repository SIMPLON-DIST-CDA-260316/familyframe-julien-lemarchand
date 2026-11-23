const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)'

// The shadcn theme switches on a `.dark` class, not on the media query.
export function followSystemTheme(): void {
  const darkScheme = window.matchMedia(DARK_SCHEME_QUERY)
  const applyScheme = (): void => {
    document.documentElement.classList.toggle('dark', darkScheme.matches)
  }
  applyScheme()
  darkScheme.addEventListener('change', applyScheme)
}
