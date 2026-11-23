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
}

export function DeletePhotoDialog({ photo, onClose }: DeletePhotoDialogProps): JSX.Element | null {
  if (!photo) return null
  return (
    <AlertDialog open onOpenChange={onClose}>
      {/* `dark`: the dialog portals to body, outside the frame's dark <main>. */}
      <AlertDialogContent className="dark">
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer cette photo ?</AlertDialogTitle>
          <AlertDialogDescription>
            La photo envoyée par {photo.uploaderName} sera supprimée de tous les cadres. Cette
            action est irréversible.
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
