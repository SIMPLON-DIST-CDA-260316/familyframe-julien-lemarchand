import { useMemo, useState } from 'react'
import type { PlaybackOrder } from '@/frameSettings.ts'
import type { Photo } from '@/photo.ts'
import { isSameOrder, nextShuffledIds } from '@/shuffleOrder.ts'

function inPlaybackOrder(photos: Photo[], ids: readonly string[]): Photo[] {
  const photosById = new Map(photos.map((photo) => [photo.id, photo]))
  return ids.flatMap((id) => photosById.get(id) ?? [])
}

// The slideshow's photos in the order they play: the feed's own (newest first), or a shuffle
// drawn once and kept, so no photo comes back before the round is over.
// sourceKey: another source draws a new round, instead of slotting its photos into the old one.
export function usePlaybackPhotos(
  photos: Photo[],
  order: PlaybackOrder,
  currentId: string | undefined,
  sourceKey: string,
): Photo[] {
  const [drawn, setDrawn] = useState<{ sourceKey: string; ids: readonly string[] }>({
    sourceKey,
    ids: [],
  })
  const [shownId, setShownId] = useState(currentId)
  const drawnIds = drawn.sourceKey === sourceKey ? drawn.ids : []

  // Adjusted during render, like the frame's selection: an effect would paint the old order once.
  if (currentId !== shownId) setShownId(currentId)
  if (order === 'shuffle') {
    const photoIds = photos.map(({ id }) => id)
    const nextIds = nextShuffledIds({ drawnIds, photoIds, shownId, currentId }, Math.random)
    if (!isSameOrder(nextIds, drawnIds)) setDrawn({ sourceKey, ids: nextIds })
  }

  const shuffledPhotos = useMemo(() => inPlaybackOrder(photos, drawnIds), [photos, drawnIds])
  return order === 'shuffle' ? shuffledPhotos : photos
}
