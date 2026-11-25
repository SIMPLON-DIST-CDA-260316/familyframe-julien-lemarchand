import { toast } from 'sonner'
import { useCollections } from '@/collections/CollectionsContext.ts'
import type { PhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
import { type SelectedCollection, selectedCollectionId } from '@/hooks/useSelectedCollection.ts'
import type { Photo } from '@/photo.ts'

// Added while a collection is shown, the photo is filed there too: that is where it was wanted.
// The collection's list then reloads on collections:changed, like any filing. Filed by id: the
// collections list may still be loading, and the answer names the collection.
export function useLibraryUpload(
  selected: SelectedCollection,
  library: PhotoLibrary,
): (photo: Photo) => void {
  const { addPhoto } = useCollections()
  return async (photo) => {
    library.addPhoto(photo)
    const collectionId = selectedCollectionId(selected)
    if (collectionId === null) return
    const result = await addPhoto(collectionId, photo.id)
    if (result.isSuccess) toast.success(`Photo ajoutée à « ${result.collection.name} ».`)
    else toast.error(result.message)
  }
}
