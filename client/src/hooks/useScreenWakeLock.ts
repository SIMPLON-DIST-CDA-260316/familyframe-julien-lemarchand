import { useEffect } from 'react'

// A lock the browser already dropped (page hidden) has nothing left to release.
function ignoreReleaseError(_error: unknown): void {}

// null when the page is hidden or the lock refused (battery saver, browser setting): no
// message, the screen may just dim.
async function requestScreenLock(): Promise<WakeLockSentinel | null> {
  if (document.visibilityState !== 'visible') return null
  try {
    return await navigator.wakeLock.request('screen')
  } catch {
    return null
  }
}

// A frame on a wall must not dim or lock after the device's idle delay. The browser drops the
// lock each time the page is hidden, so it is asked again when the page comes back.
export function useScreenWakeLock(): void {
  useEffect(() => {
    // Older browsers have no Wake Lock: the frame works, the screen follows its own settings.
    if (!('wakeLock' in navigator)) return
    let sentinel: WakeLockSentinel | null = null
    let isActive = true

    async function requestLock(): Promise<void> {
      const lock = await requestScreenLock()
      if (lock === null) return
      // The frame was left while the browser answered: nothing else would release this lock.
      if (!isActive) lock.release().catch(ignoreReleaseError)
      else sentinel = lock
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
