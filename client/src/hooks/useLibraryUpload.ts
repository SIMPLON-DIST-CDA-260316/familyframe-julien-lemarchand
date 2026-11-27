import type { RefObject } from 'react'
import { toast } from 'sonner'
import { useCollections } from '@/collections/CollectionsContext.ts'
import type { UploadedPhotoListener } from '@/upload/UploadsContext.ts'
import type { UploadedHandler } from '@/upload/uploadQueue.ts'

// Added while a collection is shown, the photo is filed there too: that is where it was wanted.
// collectionId is the one shown when the photo was chosen; the filing happens even if the library
// page was left meanwhile. The collection's list then reloads on collections:changed, like any
// filing. Filed by id: the collections list may still be loading, and the answer names the
// collection. The ref reaches the library open now, if any.
export function useLibraryUpload(
  photoListener: RefObject<UploadedPhotoListener | null>,
): UploadedHandler {
  const { addPhoto } = useCollections()
  return async (photo, collectionId) => {
    photoListener.current?.(photo)
    if (collectionId === null) return null
    const result = await addPhoto(collectionId, photo.id)
    if (result.isSuccess) return result.collection.name
    toast.error(result.message)
    return null
  }
}
