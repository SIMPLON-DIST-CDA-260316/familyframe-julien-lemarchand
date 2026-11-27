import { useEffect, useRef } from 'react'
import { isOverlayOpen } from '@/hooks/useIdle.ts'

// A key (event.key) and what it does in the viewer.
export type ViewerKeyMap = Record<string, () => void>

// Ctrl or Cmd with + and - zooms the whole page: the browser keeps those. An open menu reads
// its own keys first.
function isForTheViewer(event: KeyboardEvent): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) return false
  return !event.defaultPrevented && !isOverlayOpen()
}

export function useViewerKeys(keyMap: ViewerKeyMap): void {
  // The latest map, read on each key: the listener is added once.
  const keyMapRef = useRef(keyMap)
  useEffect(() => {
    keyMapRef.current = keyMap
  })

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (!isForTheViewer(event)) return
      const action = keyMapRef.current[event.key]
      if (action === undefined) return
      event.preventDefault()
      action()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
