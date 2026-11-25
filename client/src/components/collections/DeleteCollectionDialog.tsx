import type { JSX } from 'react'
import { toast } from 'sonner'
import { useCollections } from '@/collections/CollectionsContext.ts'
import type { Collection } from '@/collections/collection.ts'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog.tsx'

type DeleteCollectionDialogProps = {
  collection: Collection | null
  onClose: () => void
  onCloseAutoFocus: (event: Event) => void
  // The row and its menu leave the list: focus needs a place that stays.
  onDeleted: () => void
}

// A failure shows in a toast: the dialog is closed by then.
function useConfirmDeletion(onDeleted: () => void): (id: string) => Promise<void> {
  const { remove } = useCollections()
  return async (id) => {
    const result = await remove(id)
    if (result.isSuccess) onDeleted()
    else toast.error(result.message)
  }
}

// No pending state, like a photo deletion: the row leaves the list once the server agrees.
export function DeleteCollectionDialog({
  collection,
  onClose,
  onCloseAutoFocus,
  onDeleted,
}: DeleteCollectionDialogProps): JSX.Element | null {
  const confirm = useConfirmDeletion(onDeleted)
  if (!collection) return null
  return (
    <AlertDialog open onOpenChange={onClose}>
      <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle className="wrap-anywhere">
            Supprimer la collection « {collection.name} » ?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Les photos restent dans votre bibliothèque.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() => confirm(collection.id)}>
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
