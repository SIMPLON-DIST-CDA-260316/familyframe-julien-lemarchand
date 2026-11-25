// The browser bar takes the page's background, so it follows the palette and the theme chosen in
// the app, not only the device. Both metas get it: once the app runs, their media no longer matters.
export function syncThemeColor(): void {
  const background = getComputedStyle(document.documentElement)
    .getPropertyValue('--background')
    .trim()
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    meta.setAttribute('content', background)
  }
}
