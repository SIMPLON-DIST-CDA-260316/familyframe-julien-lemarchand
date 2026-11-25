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
export function usePlaybackPhotos(
  photos: Photo[],
  order: PlaybackOrder,
  currentId: string | undefined,
): Photo[] {
  const [drawnIds, setDrawnIds] = useState<readonly string[]>([])
  const [shownId, setShownId] = useState(currentId)

  // Adjusted during render, like the frame's selection: an effect would paint the old order once.
  if (currentId !== shownId) setShownId(currentId)
  if (order === 'shuffle') {
    const photoIds = photos.map(({ id }) => id)
    const nextIds = nextShuffledIds({ drawnIds, photoIds, shownId, currentId }, Math.random)
    if (!isSameOrder(nextIds, drawnIds)) setDrawnIds(nextIds)
  }

  const shuffledPhotos = useMemo(() => inPlaybackOrder(photos, drawnIds), [photos, drawnIds])
  return order === 'shuffle' ? shuffledPhotos : photos
}
