import type { JSX } from 'react'
import { FriendRequestForm } from '@/components/friends/FriendRequestForm.tsx'
import { FriendshipSection } from '@/components/friends/FriendshipSection.tsx'
import { BackToLibraryLink } from '@/components/library/BackToLibraryLink.tsx'
import { Alert, AlertDescription } from '@/components/ui/alert.tsx'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx'
import type { FriendshipList } from '@/friendship.ts'
import { useFriendships } from '@/hooks/useFriendships.ts'

function RequestCard({ onSent }: { onSent: () => void }): JSX.Element {
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
        <FriendRequestForm onSent={onSent} />
      </CardContent>
    </Card>
  )
}

// The two request lists show only when they hold something; « Mes amis » always shows.
function FriendshipLists({ friendships }: { friendships: FriendshipList }): JSX.Element {
  const { friends, incoming, outgoing } = friendships
  return (
    <>
      {incoming.length > 0 && (
        <FriendshipSection title="Demandes reçues" friendships={incoming} emptyText="" />
      )}
      {outgoing.length > 0 && (
        <FriendshipSection title="Demandes envoyées" friendships={outgoing} emptyText="" />
      )}
      <FriendshipSection
        title="Mes amis"
        friendships={friends}
        emptyText="Vous n'avez pas encore d'amis."
      />
    </>
  )
}

export default function FriendsPage(): JSX.Element {
  const { friendships, isLoading, error, reload } = useFriendships()

  return (
    <main className="mx-auto flex max-w-md flex-col gap-8 px-4 py-10">
      <RequestCard onSent={reload} />
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <FriendshipLists friendships={friendships} />
      )}
    </main>
  )
}
