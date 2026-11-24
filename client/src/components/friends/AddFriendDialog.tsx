import type { JSX } from 'react'
import { FriendRequestForm } from '@/components/friends/FriendRequestForm.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx'
import type { FriendRequestResult } from '@/friendshipsApi.ts'

type AddFriendDialogProps = {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onDone: (result: FriendRequestResult) => void
}

// Controlled from the page: the header button and the empty state both open it.
export function AddFriendDialog({
  isOpen,
  onOpenChange,
  onDone,
}: AddFriendDialogProps): JSX.Element {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un ami</DialogTitle>
          <DialogDescription>
            Saisissez l'adresse e-mail de son compte FamilyFrame : il recevra votre demande.
          </DialogDescription>
        </DialogHeader>
        <FriendRequestForm onDone={onDone} />
      </DialogContent>
    </Dialog>
  )
}
