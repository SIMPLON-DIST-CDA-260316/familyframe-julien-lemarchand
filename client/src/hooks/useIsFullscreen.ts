import { useSyncExternalStore } from 'react'
import { isFullscreen } from '@/fullscreen.ts'

function subscribeToFullscreen(onChange: () => void): () => void {
  document.addEventListener('fullscreenchange', onChange)
  return () => document.removeEventListener('fullscreenchange', onChange)
}

export function useIsFullscreen(): boolean {
  return useSyncExternalStore(subscribeToFullscreen, isFullscreen)
}
