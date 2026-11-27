import { useState } from 'react'
import type { Photo } from '@/photo.ts'

export type FrameSelection = {
  currentId: string | undefined
  newPhotoCount: number
  selectPhoto: (id: string) => void
  showNewest: () => void
}

// startId: the photo the slideshow starts on (/frame?photo=<id>), null for the newest.
export function useFrameSelection(
  photos: Photo[],
  isActive: boolean,
  startId: string | null,
): FrameSelection {
  // null follows the newest photo.
  const [selectedId, setSelectedId] = useState<string | null>(startId)
  const [newPhotoCount, setNewPhotoCount] = useState(0)
  const newestId = photos.at(0)?.id
  const [shownNewestId, setShownNewestId] = useState(newestId)
  // The pinned photo may have been deleted: fall back to the newest.
  const pinnedId = photos.find(({ id }) => id === selectedId)?.id

  function handleArrival(previousNewestId: string): void {
    if (isActive) {
      // Someone is looking: keep their photo on screen.
      setSelectedId(pinnedId ?? previousNewestId)
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

  return { currentId: pinnedId ?? newestId, newPhotoCount, selectPhoto, showNewest }
}
