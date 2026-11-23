import { useEffect, useState } from 'react'

const CONTROLS_HIDE_DELAY_MS = 4000
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = ['pointermove', 'pointerdown', 'keydown']

export function useIdleControls(): boolean {
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    let hideTimer: number | undefined

    function showControls(): void {
      setIsActive(true)
      window.clearTimeout(hideTimer)
      hideTimer = window.setTimeout(() => setIsActive(false), CONTROLS_HIDE_DELAY_MS)
    }

    for (const eventName of ACTIVITY_EVENTS) window.addEventListener(eventName, showControls)
    return () => {
      window.clearTimeout(hideTimer)
      for (const eventName of ACTIVITY_EVENTS) window.removeEventListener(eventName, showControls)
    }
  }, [])

  return isActive
}
