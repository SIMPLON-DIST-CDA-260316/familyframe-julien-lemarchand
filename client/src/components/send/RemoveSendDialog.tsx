import { Trash2Icon } from 'lucide-react'
import type { JSX } from 'react'
import { IconButton } from '@/components/actions/IconButton.tsx'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog.tsx'

// It asks first: a removed line cannot come back. The description reassures, since « retirer »
// could read as taking the photo back from the friends.
export function RemoveSendDialog({ onConfirm }: { onConfirm: () => void }): JSX.Element {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <IconButton
          surface="page"
          aria-label="Retirer de l'historique"
          title="Retirer de l'historique"
        >
          <Trash2Icon aria-hidden />
        </IconButton>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Retirer cet envoi de l'historique ?</AlertDialogTitle>
          <AlertDialogDescription>Vos proches gardent la photo.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Retirer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
