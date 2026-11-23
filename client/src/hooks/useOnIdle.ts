import { useState } from 'react'

// Calls onIdle once when isActive turns false, not on every render while idle: leaving a
// slideshow that played unattended must not relaunch it before anyone has moved.
export function useOnIdle(isActive: boolean, onIdle: () => void): void {
  const [wasActive, setWasActive] = useState(isActive)

  // Adjusted during render, like useFrameSelection: an effect would need onIdle in its
  // dependencies, a new function on every render.
  if (isActive !== wasActive) {
    setWasActive(isActive)
    if (!isActive) onIdle()
  }
}
