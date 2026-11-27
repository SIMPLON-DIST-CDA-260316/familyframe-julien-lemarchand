import { type RefObject, useRef, useState } from 'react'
import type { ShareTarget } from '@/hooks/useShareSending.ts'
import { shownButton } from '@/lib/shownButton.ts'

export type SendFlow = {
  isChoosingSource: boolean
  // The photo on its way: the send panel is open while it is set.
  target: ShareTarget | null
  openSources: () => void
  closeSources: () => void
  chooseTarget: (target: ShareTarget) => void
  closeShare: () => void
  returnFocus: (event: Event) => void
}

// Two panels in a row: the source choice, then the send panel. Focus goes back to the shown
// « Envoyer une photo » only at the very end, not while the send panel takes over from the
// source choice. triggerRefs: the header's and the floating one. onShareClosed: the page reloads
// its history, the send may have added a line.
export function useSendFlow(
  triggerRefs: RefObject<HTMLButtonElement | null>[],
  onShareClosed: () => void,
): SendFlow {
  const [isChoosingSource, setIsChoosingSource] = useState(false)
  const [target, setTarget] = useState<ShareTarget | null>(null)
  const isHandingOver = useRef(false)
  return {
    isChoosingSource,
    target,
    openSources: () => setIsChoosingSource(true),
    closeSources: () => setIsChoosingSource(false),
    chooseTarget: (chosen) => {
      isHandingOver.current = true
      setTarget(chosen)
      setIsChoosingSource(false)
    },
    closeShare: () => {
      isHandingOver.current = false
      setTarget(null)
      onShareClosed()
    },
    returnFocus: (event) => {
      event.preventDefault()
      if (!isHandingOver.current) shownButton(triggerRefs)?.focus()
    },
  }
}
