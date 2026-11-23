import { useState } from 'react'
import type { Photo } from '@/photo.ts'

export type FrameMode = 'library' | 'slideshow'

export type FrameSelection = {
  mode: FrameMode
  currentId: string | undefined
  newPhotoCount: number
  selectPhoto: (id: string) => void
  openPhoto: (id: string) => void
  showNewest: () => void
  startSlideshow: () => void
  closeSlideshow: () => void
}

export function useFrameSelection(photos: Photo[], isActive: boolean): FrameSelection {
  const [mode, setMode] = useState<FrameMode>('library')
  // null follows the newest photo.
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [newPhotoCount, setNewPhotoCount] = useState(0)
  const newestId = photos.at(0)?.id
  const [shownNewestId, setShownNewestId] = useState(newestId)
  // The pinned photo may have been deleted: fall back to the newest.
  const pinnedId = photos.find(({ id }) => id === selectedId)?.id

  function handleArrival(previousNewestId: string): void {
    if (isActive || mode === 'library') {
      // Someone is looking: keep their photo on screen, or ringed in the library.
      setSelectedId(pinnedId ?? previousNewestId)
      // The badge belongs to the slideshow: in the library the new photo simply appears first.
      if (mode === 'library') return
      // A refetch after a reconnect can bring several photos at once.
      const previousNewestIndex = photos.findIndex(({ id }) => id === previousNewestId)
      const arrivedCount = Math.max(previousNewestIndex, 1)
      setNewPhotoCount((count) => count + arrivedCount)
      return
    }
    showNewest()
  }

  // Adjusted during render, not in an effect: an effect would paint the new photo once
  // before pinning the viewed one back.
  if (newestId !== shownNewestId) {
    setShownNewestId(newestId)
    // undefined: the first load, nothing arrived. A previous newest missing from the list was deleted.
    if (shownNewestId !== undefined && photos.some(({ id }) => id === shownNewestId)) {
      handleArrival(shownNewestId)
    }
  }
  // Nobody is looking any more: show what arrived meanwhile.
  if (!isActive && newPhotoCount > 0) showNewest()

  function showNewest(): void {
    setSelectedId(null)
    setNewPhotoCount(0)
  }

  function selectPhoto(id: string): void {
    if (id === newestId) {
      setSelectedId(null)
      setNewPhotoCount(0)
      return
    }
    setSelectedId(id)
  }

  function openPhoto(id: string): void {
    selectPhoto(id)
    setMode('slideshow')
  }

  function startSlideshow(): void {
    showNewest()
    setMode('slideshow')
  }

  function closeSlideshow(): void {
    setMode('library')
    // A leftover count would make the idle jump move the library's ring to the newest photo.
    setNewPhotoCount(0)
  }

  return {
    mode,
    currentId: pinnedId ?? newestId,
    newPhotoCount,
    selectPhoto,
    openPhoto,
    showNewest,
    startSlideshow,
    closeSlideshow,
  }
}
