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
  onCloseAutoFocus: (event: Event) => void
}

// Controlled from the page: its triggers open it, and the page says where focus goes after.
export function AddFriendDialog({
  isOpen,
  onOpenChange,
  onDone,
  onCloseAutoFocus,
}: AddFriendDialogProps): JSX.Element {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent onCloseAutoFocus={onCloseAutoFocus}>
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
