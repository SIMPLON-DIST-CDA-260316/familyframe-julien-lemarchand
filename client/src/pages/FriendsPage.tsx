import { UserPlusIcon } from 'lucide-react'
import { type JSX, useRef } from 'react'
import { RetryButton } from '@/components/feedback/RetryButton.tsx'
import { AddFriendDialog } from '@/components/friends/AddFriendDialog.tsx'
import { FriendshipSection } from '@/components/friends/FriendshipSection.tsx'
import { FriendsSkeleton } from '@/components/friends/FriendsSkeleton.tsx'
import { type FriendsView, FriendsViewToggle } from '@/components/friends/FriendsViewToggle.tsx'
import { NoFriendsYet } from '@/components/friends/NoFriendsYet.tsx'
import { NoPendingRequests } from '@/components/friends/NoPendingRequests.tsx'
import { RemoveFriendDialog } from '@/components/friends/RemoveFriendDialog.tsx'
import { PageFab } from '@/components/nav/PageFab.tsx'
import { Alert, AlertDescription } from '@/components/ui/alert.tsx'
import { Button } from '@/components/ui/button.tsx'
import type { Friendship, FriendshipList } from '@/friendship.ts'
import type { FriendshipActions } from '@/hooks/useFriendshipActions.ts'
import { useFriendships } from '@/hooks/useFriendships.ts'
import { type FriendsPageState, useFriendsPage } from '@/hooks/useFriendsPage.ts'

const ADD_FRIEND_LABEL = 'Ajouter un ami'

// A phone floats « Ajouter un ami » instead, where the thumb rests, like the library's « + ».
function PageHeader({ onAddFriend }: { onAddFriend: () => void }): JSX.Element {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Amis</h1>
        <p className="text-sm text-muted-foreground">
          Les proches à qui vous pouvez envoyer des photos.
        </p>
      </div>
      <Button className="hidden md:inline-flex" onClick={onAddFriend}>
        <UserPlusIcon aria-hidden data-icon="inline-start" />
        {ADD_FRIEND_LABEL}
      </Button>
    </header>
  )
}

function incomingButtons({ id }: Friendship, actions: FriendshipActions): JSX.Element {
  const isBusy = actions.busyIds.includes(id)
  return (
    <>
      <Button size="sm" disabled={isBusy} onClick={() => actions.accept(id)}>
        Accepter
      </Button>
      <Button variant="outline" size="sm" disabled={isBusy} onClick={() => actions.remove(id)}>
        Refuser
      </Button>
    </>
  )
}

function outgoingButtons({ id }: Friendship, actions: FriendshipActions): JSX.Element {
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={actions.busyIds.includes(id)}
      onClick={() => actions.remove(id)}
    >
      Annuler
    </Button>
  )
}

function friendButtons(friendship: Friendship, actions: FriendshipActions): JSX.Element {
  const { id } = friendship
  return (
    <RemoveFriendDialog
      friendship={friendship}
      isBusy={actions.busyIds.includes(id)}
      onConfirm={() => actions.remove(id)}
    />
  )
}

type ListsProps = {
  friendships: FriendshipList
  actions: FriendshipActions
}

// Received first: they are the ones waiting for an answer from me.
function PendingLists({ friendships, actions }: ListsProps): JSX.Element {
  const { incoming, outgoing } = friendships
  if (incoming.length === 0 && outgoing.length === 0) return <NoPendingRequests />
  return (
    <>
      {incoming.length > 0 && (
        <FriendshipSection
          title="Demandes reçues"
          friendships={incoming}
          renderActions={(friendship) => incomingButtons(friendship, actions)}
        />
      )}
      {outgoing.length > 0 && (
        <FriendshipSection
          title="Demandes envoyées"
          friendships={outgoing}
          renderActions={(friendship) => outgoingButtons(friendship, actions)}
        />
      )}
    </>
  )
}

type FriendshipViewsProps = ListsProps & {
  // null until the user picks one: then a received request opens « En attente ».
  view: FriendsView | null
  onViewChange: (view: FriendsView) => void
  onAddFriend: () => void
}

function FriendshipViews({
  friendships,
  actions,
  view,
  onViewChange,
  onAddFriend,
}: FriendshipViewsProps): JSX.Element {
  const { friends, incoming, outgoing } = friendships
  const shownView = view ?? (incoming.length > 0 ? 'pending' : 'friends')
  return (
    <div className="flex flex-col gap-6">
      <FriendsViewToggle
        view={shownView}
        onViewChange={onViewChange}
        friendCount={friends.length}
        pendingCount={incoming.length + outgoing.length}
        incomingCount={incoming.length}
      />
      {shownView === 'friends' ? (
        <FriendshipSection
          friendships={friends}
          emptyState={<NoFriendsYet onAddFriend={onAddFriend} />}
          renderActions={(friendship) => friendButtons(friendship, actions)}
        />
      ) : (
        <PendingLists friendships={friendships} actions={actions} />
      )}
    </div>
  )
}

function Notices({ error, notice }: { error: string; notice: string }): JSX.Element {
  return (
    <>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {notice && (
        <Alert>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}
    </>
  )
}

// The dialog opens from the header, the empty list and, on a phone, this floating button. Radix
// gives focus back to whichever opened it: the ref is only the button's own, for hiding on scroll.
function AddFriend({ page, onOpen }: { page: FriendsPageState; onOpen: () => void }): JSX.Element {
  const fabRef = useRef<HTMLButtonElement>(null)
  return (
    <>
      <PageFab icon={UserPlusIcon} label={ADD_FRIEND_LABEL} onClick={onOpen} buttonRef={fabRef} />
      <AddFriendDialog
        isOpen={page.isDialogOpen}
        onOpenChange={page.setIsDialogOpen}
        onDone={page.handleRequestDone}
      />
    </>
  )
}

export default function FriendsPage(): JSX.Element {
  const { friendships, isLoading, error, reload } = useFriendships()
  const page = useFriendsPage(reload)
  const openDialog = (): void => page.setIsDialogOpen(true)

  return (
    // pb-24 below md: the floating button never covers the last friend's « Retirer ».
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 pt-10 pb-24 md:pb-10">
      <PageHeader onAddFriend={openDialog} />
      <Notices error={error || page.actions.error} notice={page.notice} />
      {/* Only for the list's own load: a failed action keeps its message and the list. */}
      {error && <RetryButton onRetry={reload} />}
      {isLoading && <FriendsSkeleton />}
      {!isLoading && !error && (
        <FriendshipViews
          friendships={friendships}
          actions={page.actions}
          view={page.view}
          onViewChange={page.setView}
          onAddFriend={openDialog}
        />
      )}
      <AddFriend page={page} onOpen={openDialog} />
    </main>
  )
}
