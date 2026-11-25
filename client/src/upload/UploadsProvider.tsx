import { type JSX, type ReactNode, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/auth/AuthContext.ts'
import { useLibraryUpload } from '@/hooks/useLibraryUpload.ts'
import { type UploadedPhotoListener, UploadsContext } from '@/upload/UploadsContext.ts'
import {
  createQueueState,
  enqueueUploads,
  type PendingUpload,
  startQueue,
  stopQueue,
} from '@/upload/uploadQueue.ts'

// Above the routes, like the collections: leaving the library does not stop the queue, and its
// tiles are back on return. A second choice joins the same queue, so photos still go one by one.
// Behind RequireAuth: logging out unmounts it, which stops the queue.
export function UploadsProvider({ children }: { children: ReactNode }): JSX.Element {
  const { dropUser } = useAuth()
  const [pending, setPending] = useState<PendingUpload[]>([])
  // useState keeps one queue across renders.
  const [state] = useState(createQueueState)
  const photoListener = useRef<UploadedPhotoListener | null>(null)
  const onUploaded = useLibraryUpload(photoListener)
  useEffect(() => {
    startQueue(state)
    return () => stopQueue(state)
  }, [state])
  const context = { state, setPending, onUploaded, dropUser }
  const enqueue = (files: File[], collectionId: string | null): void =>
    enqueueUploads(context, files, collectionId)

  return <UploadsContext value={{ pending, enqueue, photoListener }}>{children}</UploadsContext>
}
