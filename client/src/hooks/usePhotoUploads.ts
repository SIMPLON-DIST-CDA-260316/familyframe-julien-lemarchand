import { useEffect } from 'react'
import type { PhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
import { useUploads } from '@/upload/UploadsContext.ts'
import type { PendingUpload } from '@/upload/uploadQueue.ts'

export type PhotoUploads = {
  // Only the uploads chosen from the view shown: a tile stays where its photo was wanted.
  pending: PendingUpload[]
  enqueue: (files: File[]) => void
}

// The library page's side of the queue: its view filters the tiles and tags new choices, and its
// adder receives each photo sent while the page is open.
export function usePhotoUploads(collectionId: string | null, library: PhotoLibrary): PhotoUploads {
  const { pending, enqueue, photoListener } = useUploads()
  const { addPhoto } = library

  useEffect(() => {
    photoListener.current = addPhoto
    return () => {
      photoListener.current = null
    }
  }, [photoListener, addPhoto])

  return {
    pending: pending.filter((upload) => upload.collectionId === collectionId),
    enqueue: (files) => enqueue(files, collectionId),
  }
}
