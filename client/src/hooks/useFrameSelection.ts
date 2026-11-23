import { useState } from 'react'
import type { FrameView } from '@/components/frame/FrameControls.tsx'
import type { Photo } from '@/photo.ts'

type FrameSelection = {
  view: FrameView
  currentId: string | undefined
  newPhotoCount: number
  setView: (view: FrameView) => void
  selectPhoto: (id: string) => void
  openPhoto: (id: string) => void
  showNewest: () => void
}

export function useFrameSelection(photos: Photo[], isActive: boolean): FrameSelection {
  const [view, setView] = useState<FrameView>('photo')
  // null follows the newest photo.
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [newPhotoCount, setNewPhotoCount] = useState(0)
  const newestId = photos.at(0)?.id
  const [shownNewestId, setShownNewestId] = useState(newestId)

  function handleArrival(previousNewestId: string): void {
    if (isActive) {
      // Someone is looking: keep their photo on screen.
      setSelectedId((id) => id ?? previousNewestId)
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
    // undefined: the first load, nothing arrived.
    if (shownNewestId !== undefined) handleArrival(shownNewestId)
  }

  function showNewest(): void {
    setSelectedId(null)
    setNewPhotoCount(0)
    setView('photo')
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
    setView('photo')
  }

  return {
    view,
    currentId: selectedId ?? newestId,
    newPhotoCount,
    setView,
    selectPhoto,
    openPhoto,
    showNewest,
  }
}
