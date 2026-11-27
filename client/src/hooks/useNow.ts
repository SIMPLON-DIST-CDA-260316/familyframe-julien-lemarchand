import { useEffect, useState } from 'react'

// The current time, renewed every intervalMs: « à l'instant » becomes « il y a 1 min » on a page
// left open.
export function useNow(intervalMs: number): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}
