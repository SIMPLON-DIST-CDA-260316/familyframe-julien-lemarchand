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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog.tsx'
import { Button } from '@/components/ui/button.tsx'
import type { Friendship } from '@/friendship.ts'

type RemoveFriendDialogProps = {
  friendship: Friendship
  isBusy: boolean
  onConfirm: () => void
}

// Removing is the one action that ends something both sides built: it asks first.
export function RemoveFriendDialog({
  friendship,
  isBusy,
  onConfirm,
}: RemoveFriendDialogProps): JSX.Element {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={isBusy}>
          Retirer
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Retirer {friendship.user.displayName} de vos amis ?</AlertDialogTitle>
          <AlertDialogDescription>
            Vous ne pourrez plus vous envoyer de photos. Chacun pourra refaire une demande.
          </AlertDialogDescription>
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
