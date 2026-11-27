// undefined on iPhone Safari, which has no element full screen: frame mode then stays in the browser.
export function isFullscreenAvailable(): boolean {
  return document.fullscreenEnabled === true
}

export function isFullscreen(): boolean {
  return document.fullscreenElement instanceof Element
}

// A refused request (no user gesture, a browser setting) is no error for the user: the frame
// works in the window too.
function ignoreRefusal(_error: unknown): void {}

// Call it from a click handler: browsers grant full screen only during a user gesture.
export function enterFullscreen(): void {
  if (!isFullscreenAvailable() || isFullscreen()) return
  document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(ignoreRefusal)
}

export function exitFullscreen(): void {
  if (!isFullscreen()) return
  document.exitFullscreen().catch(ignoreRefusal)
}
