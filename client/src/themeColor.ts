// The tokens are OKLCH, which a browser may not accept in a theme-color meta: painting one pixel
// with the colour and reading it back gives plain RGB, whatever the browser.
function toRgb(color: string): string | null {
  const context = document.createElement('canvas').getContext('2d')
  if (context === null) return null
  context.fillStyle = color
  context.fillRect(0, 0, 1, 1)
  const [red, green, blue] = context.getImageData(0, 0, 1, 1).data
  return `rgb(${red}, ${green}, ${blue})`
}

// The browser bar takes the page's background, so it follows the palette and the theme chosen in
// the app, not only the device. Both metas get it: once the app runs, their media no longer matters.
export function syncThemeColor(): void {
  const background = getComputedStyle(document.documentElement)
    .getPropertyValue('--background')
    .trim()
  const rgb = toRgb(background)
  if (rgb === null) return
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    meta.setAttribute('content', rgb)
  }
}
