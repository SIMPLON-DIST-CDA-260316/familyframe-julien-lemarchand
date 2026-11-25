import { useSyncExternalStore } from 'react'

function subscribe(onChange: () => void): () => void {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

// false is reliable: the device has no network. true may lie (a captive Wi-Fi): the loads then
// fail and offer « Réessayer ».
export function useIsOnline(): boolean {
  return useSyncExternalStore(subscribe, () => navigator.onLine)
}
