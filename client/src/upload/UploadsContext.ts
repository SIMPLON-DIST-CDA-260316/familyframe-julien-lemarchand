import { createContext, type RefObject, useContext } from 'react'
import type { Photo } from '@/photo.ts'
import type { PendingUpload } from '@/upload/uploadQueue.ts'

// The open library's adder; the ref holds null while no library page is open.
export type UploadedPhotoListener = (photo: Photo) => void

export type UploadsContextValue = {
  // Every upload still on its way, in the order chosen, whatever the view.
  pending: PendingUpload[]
  enqueue: (files: File[], collectionId: string | null) => void
  photoListener: RefObject<UploadedPhotoListener | null>
}

export const UploadsContext = createContext<UploadsContextValue | null>(null)

export function useUploads(): UploadsContextValue {
  const value = useContext(UploadsContext)
  if (value === null) throw new Error('useUploads must be used inside UploadsProvider')
  return value
}
