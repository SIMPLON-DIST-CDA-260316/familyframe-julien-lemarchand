import { useEffect } from 'react'

// A lock the browser already dropped (page hidden) has nothing left to release.
function ignoreReleaseError(_error: unknown): void {}

// A frame on a wall must not dim or lock after the device's idle delay. The browser drops the
// lock each time the page is hidden, so it is asked again when the page comes back.
export function useScreenWakeLock(): void {
  useEffect(() => {
    // Older browsers have no Wake Lock: the frame works, the screen follows its own settings.
    if (!('wakeLock' in navigator)) return
    let sentinel: WakeLockSentinel | null = null
    let isActive = true

    async function requestLock(): Promise<void> {
      if (document.visibilityState !== 'visible') return
      try {
        const lock = await navigator.wakeLock.request('screen')
        // The frame was left while the browser answered: nothing else would release this lock.
        if (!isActive) {
          await lock.release()
          return
        }
        sentinel = lock
      } catch {
        // Refused (battery saver, browser setting): no message, the screen may just dim.
      }
    }

    requestLock()
    document.addEventListener('visibilitychange', requestLock)
    return () => {
      isActive = false
      document.removeEventListener('visibilitychange', requestLock)
      sentinel?.release().catch(ignoreReleaseError)
    }
  }, [])
}
