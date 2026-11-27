import { useCallback, useSyncExternalStore } from 'react'

// Tailwind's md breakpoint, where the page layout switches too.
export const DESKTOP_QUERY = '(min-width: 48rem)'

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void): (() => void) => {
      const mediaQueryList = window.matchMedia(query)
      mediaQueryList.addEventListener('change', onChange)
      return () => mediaQueryList.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches)
}
