import { toast } from 'sonner'
import { useCollections } from '@/collections/CollectionsContext.ts'
import type { PhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
import type { Photo } from '@/photo.ts'

// Resolves to the collection's name once filed, null when nothing was filed.
export type UploadedHandler = (photo: Photo, collectionId: string | null) => Promise<string | null>

// Added while a collection is shown, the photo is filed there too: that is where it was wanted.
// collectionId is the one shown when the photo was chosen. The collection's list then reloads on
// collections:changed, like any filing. Filed by id: the collections list may still be loading,
// and the answer names the collection.
export function useLibraryUpload(library: PhotoLibrary): UploadedHandler {
  const { addPhoto } = useCollections()
  return async (photo, collectionId) => {
    library.addPhoto(photo)
    if (collectionId === null) return null
    const result = await addPhoto(collectionId, photo.id)
    if (result.isSuccess) return result.collection.name
    toast.error(result.message)
    return null
  }
}
