import type { JSX } from 'react'
import { FriendRequestForm } from '@/components/friends/FriendRequestForm.tsx'
import { FriendshipSection } from '@/components/friends/FriendshipSection.tsx'
import { RemoveFriendDialog } from '@/components/friends/RemoveFriendDialog.tsx'
import { BackToLibraryLink } from '@/components/library/BackToLibraryLink.tsx'
import { Alert, AlertDescription } from '@/components/ui/alert.tsx'
import { Button } from '@/components/ui/button.tsx'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx'
import type { Friendship, FriendshipList } from '@/friendship.ts'
import { type FriendshipActions, useFriendshipActions } from '@/hooks/useFriendshipActions.ts'
import { useFriendships } from '@/hooks/useFriendships.ts'

function RequestCard({ onDone }: { onDone: () => void }): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Amis</CardTitle>
        <CardDescription>
          Ajoutez un proche avec l'adresse e-mail de son compte FamilyFrame.
        </CardDescription>
        <CardAction>
          <BackToLibraryLink />
        </CardAction>
      </CardHeader>
      <CardContent>
        <FriendRequestForm onDone={onDone} />
      </CardContent>
    </Card>
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

type FriendshipListsProps = {
  friendships: FriendshipList
  actions: FriendshipActions
}

// The two request lists show only when they hold something; « Mes amis » always shows.
function FriendshipLists({ friendships, actions }: FriendshipListsProps): JSX.Element {
  const { friends, incoming, outgoing } = friendships
  return (
    <>
      {incoming.length > 0 && (
        <FriendshipSection
          title="Demandes reçues"
          friendships={incoming}
          emptyText=""
          renderActions={(friendship) => incomingButtons(friendship, actions)}
        />
      )}
      {outgoing.length > 0 && (
        <FriendshipSection
          title="Demandes envoyées"
          friendships={outgoing}
          emptyText=""
          renderActions={(friendship) => outgoingButtons(friendship, actions)}
        />
      )}
      <FriendshipSection
        title="Mes amis"
        friendships={friends}
        emptyText="Vous n'avez pas encore d'amis."
        renderActions={(friendship) => friendButtons(friendship, actions)}
      />
    </>
  )
}

export default function FriendsPage(): JSX.Element {
  const { friendships, isLoading, error, reload } = useFriendships()
  const actions = useFriendshipActions(reload)
  const { clearError } = actions

  function handleRequestDone(): void {
    clearError()
    reload()
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-8 px-4 py-10">
      <RequestCard onDone={handleRequestDone} />
      {(error || actions.error) && (
        <Alert variant="destructive">
          <AlertDescription>{error || actions.error}</AlertDescription>
        </Alert>
      )}
      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {!isLoading && !error && <FriendshipLists friendships={friendships} actions={actions} />}
    </main>
  )
}
