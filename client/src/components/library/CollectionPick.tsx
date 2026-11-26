import { type JSX, useState } from 'react'
import { toast } from 'sonner'
import { useCollections } from '@/collections/CollectionsContext.ts'
import type { Collection } from '@/collections/collection.ts'
import { PhotoMultiPicker } from '@/components/library/PhotoMultiPicker.tsx'
import { Button } from '@/components/ui/button.tsx'
import { uploadSummary } from '@/upload/uploadTexts.ts'

// Same bound as the server: past it the other tiles are disabled instead of answering an error.
const MAX_PHOTOS_PER_ADD = 100

type CollectionPickProps = {
  collection: Collection
  onAdded: () => void
}

function addLabel(count: number): string {
  if (count === 0) return 'Ajouter des photos'
  return count === 1 ? 'Ajouter 1 photo' : `Ajouter ${count} photos`
}

// A failure keeps the panel open with the choice, so adding again needs no new pick. The toast
// says what an upload into the collection says.
function useAddChosen(collection: Collection, onAdded: () => void) {
  const { addPhotos } = useCollections()
  const [isAdding, setIsAdding] = useState(false)
  async function add(photoIds: string[]): Promise<void> {
    setIsAdding(true)
    const result = await addPhotos(collection.id, photoIds)
    setIsAdding(false)
    if (!result.isSuccess) {
      toast.error(result.message)
      return
    }
    const tally = { addedCount: photoIds.length, refusedCount: 0, collectionName: collection.name }
    toast.success(uploadSummary(tally))
    onAdded()
  }
  return { isAdding, add }
}

export function CollectionPick({ collection, onAdded }: CollectionPickProps): JSX.Element {
  const [chosenIds, setChosenIds] = useState<string[]>([])
  const { isAdding, add } = useAddChosen(collection, onAdded)

  function toggle(photoId: string): void {
    setChosenIds((ids) =>
      ids.includes(photoId) ? ids.filter((id) => id !== photoId) : [...ids, photoId],
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <PhotoMultiPicker
        chosenIds={chosenIds}
        inIds={collection.photoIds}
        isFull={chosenIds.length >= MAX_PHOTOS_PER_ADD}
        onToggle={toggle}
      />
      <Button disabled={chosenIds.length === 0 || isAdding} onClick={() => add(chosenIds)}>
        {addLabel(chosenIds.length)}
      </Button>
    </div>
  )
}
