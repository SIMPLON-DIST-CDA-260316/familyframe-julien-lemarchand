import { toast } from 'sonner'
import { useCollections } from '@/collections/CollectionsContext.ts'
import type { PhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
import type { SelectedCollection } from '@/hooks/useSelectedCollection.ts'
import type { Photo } from '@/photo.ts'

// Added while a collection is shown, the photo is filed there too: that is where it was wanted.
// The collection's list then reloads on collections:changed, like any filing.
export function useLibraryUpload(
  selected: SelectedCollection,
  library: PhotoLibrary,
): (photo: Photo) => void {
  const { addPhoto } = useCollections()
  return async (photo) => {
    library.addPhoto(photo)
    if (selected.status !== 'found') return
    const { id, name } = selected.collection
    const result = await addPhoto(id, photo.id)
    if (result.isSuccess) toast.success(`Photo ajoutée à « ${name} ».`)
    else toast.error(result.message)
  }
}
