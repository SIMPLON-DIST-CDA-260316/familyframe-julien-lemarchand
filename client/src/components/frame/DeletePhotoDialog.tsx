import type { JSX } from 'react'
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
import { deletePhoto } from '@/deletePhoto.ts'
import type { Photo } from '@/photo.ts'

type DeletePhotoDialogProps = {
  // The photo picked when the dialog opened: the slideshow may move on while it stays open.
  photo: Photo | null
  onClose: () => void
  onCloseAutoFocus: (event: Event) => void
  // The dialog portals to body: the photo menu passes its theme (`dark` on the frame).
  className?: string
}

export function DeletePhotoDialog({
  photo,
  onClose,
  onCloseAutoFocus,
  className,
}: DeletePhotoDialogProps): JSX.Element | null {
  if (!photo) return null
  return (
    <AlertDialog open onOpenChange={onClose}>
      <AlertDialogContent className={className} onCloseAutoFocus={onCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer cette photo ?</AlertDialogTitle>
          <AlertDialogDescription>
            Cette photo sera supprimée de votre bibliothèque et de votre cadre. Cette action est
            irréversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() => deletePhoto(photo)}>
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
