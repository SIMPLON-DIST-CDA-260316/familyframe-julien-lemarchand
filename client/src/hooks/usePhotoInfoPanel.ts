import { useState } from 'react'
import { DESKTOP_QUERY, useMediaQuery } from '@/hooks/useMediaQuery.ts'

// Per tab: someone who reads the infos on a computer finds them open on the next photo opened.
const STORAGE_KEY = 'familyframe.viewerInfoOpen'

export type PhotoInfoPanel = {
  isOpen: boolean
  // A side panel beside the photo on a computer, a drawer from the bottom on a phone.
  isDesktop: boolean
  toggle: () => void
  close: () => void
}

// sessionStorage throws when the browser blocks site data: the panel then starts closed.
function readRememberedOpen(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function rememberOpen(isOpen: boolean): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, String(isOpen))
  } catch {
    // Not remembered: the panel works for this viewer all the same.
  }
}

// On a phone the drawer hides half the photo: it always starts closed, and is not remembered.
export function usePhotoInfoPanel(): PhotoInfoPanel {
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const [isOpenOnDesktop, setIsOpenOnDesktop] = useState(readRememberedOpen)
  const [isOpenOnPhone, setIsOpenOnPhone] = useState(false)
  const setIsOpen = (isOpen: boolean): void => {
    if (!isDesktop) {
      setIsOpenOnPhone(isOpen)
      return
    }
    setIsOpenOnDesktop(isOpen)
    rememberOpen(isOpen)
  }
  const isOpen = isDesktop ? isOpenOnDesktop : isOpenOnPhone
  return { isOpen, isDesktop, toggle: () => setIsOpen(!isOpen), close: () => setIsOpen(false) }
}
