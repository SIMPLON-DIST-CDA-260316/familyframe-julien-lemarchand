import type { JSX } from 'react'
import { Link } from 'react-router'
import { FriendshipRow } from '@/components/friends/FriendshipRow.tsx'
import { Alert, AlertDescription } from '@/components/ui/alert.tsx'
import { Button } from '@/components/ui/button.tsx'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx'
import type { Friendship } from '@/friendship.ts'
import { type FriendShares, type ShareTarget, useFriendShares } from '@/hooks/useFriendShares.ts'
import { useFriendships } from '@/hooks/useFriendships.ts'
import { usePreviewUrl } from '@/hooks/usePreviewUrl.ts'
import { photoLabel } from '@/photoLabel.ts'

type SharePhotoDialogProps = {
  // Picked when the dialog opened: the slideshow may move on while it stays open.
  target: ShareTarget | null
  onClose: () => void
  // The upload form empties its inputs after a first success.
  onShared?: () => void
  onCloseAutoFocus?: (event: Event) => void
  className?: string
}

type ShareFriendsProps = {
  target: ShareTarget
  onShared?: () => void
}

type ShareButtonProps = {
  friendId: string
  shares: FriendShares
}

function SharePreview({ target }: { target: ShareTarget }): JSX.Element | null {
  const fileUrl = usePreviewUrl(target.kind === 'device' ? target.file : null)
  const src = target.kind === 'library' ? target.photo.thumbnailUrl : fileUrl
  if (!src) return null
  const alt = target.kind === 'library' ? photoLabel(target.photo) : 'Aperçu avant envoi'
  return <img className="mx-auto max-h-40 rounded-lg object-contain" src={src} alt={alt} />
}

function shareButtonText(isSent: boolean, isSending: boolean): string {
  if (isSent) return 'Envoyée'
  return isSending ? 'Envoi…' : 'Envoyer'
}

function ShareButton({ friendId, shares }: ShareButtonProps): JSX.Element {
  const isSent = shares.sentIds.includes(friendId)
  const isSending = shares.sendingIds.includes(friendId)
  return (
    <Button size="sm" disabled={isSent || isSending} onClick={() => shares.send(friendId)}>
      {shareButtonText(isSent, isSending)}
    </Button>
  )
}

function NoFriends(): JSX.Element {
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-sm text-muted-foreground">Vous n'avez pas encore d'amis.</p>
      <Button asChild variant="outline" size="sm">
        <Link to="/friends">Ajouter un ami</Link>
      </Button>
    </div>
  )
}

function ErrorAlert({ message }: { message: string }): JSX.Element {
  return (
    <Alert variant="destructive">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}

type FriendListProps = {
  friends: Friendship[]
  shares: FriendShares
}

function FriendList({ friends, shares }: FriendListProps): JSX.Element {
  return (
    <ul className="divide-y">
      {friends.map((friendship) => (
        <FriendshipRow key={friendship.id} friendship={friendship}>
          <ShareButton friendId={friendship.user.id} shares={shares} />
        </FriendshipRow>
      ))}
    </ul>
  )
}

// Pending requests cannot receive: accepted friends only.
function ShareFriends({ target, onShared }: ShareFriendsProps): JSX.Element {
  const { friendships, isLoading, error } = useFriendships()
  const shares = useFriendShares(target, onShared)
  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>
  if (error) return <ErrorAlert message={error} />
  if (friendships.friends.length === 0) return <NoFriends />
  return (
    <>
      {shares.error && <ErrorAlert message={shares.error} />}
      <FriendList friends={friendships.friends} shares={shares} />
    </>
  )
}

export function SharePhotoDialog({
  target,
  onClose,
  onShared,
  onCloseAutoFocus,
  className,
}: SharePhotoDialogProps): JSX.Element | null {
  if (!target) return null
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        className={className}
        showCloseButton={false}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DialogHeader>
          <DialogTitle>Envoyer à un ami</DialogTitle>
          <DialogDescription>
            La photo s'affiche sur le cadre de l'ami que vous choisissez.
          </DialogDescription>
        </DialogHeader>
        <SharePreview target={target} />
        <ShareFriends target={target} onShared={onShared} />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Fermer</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
