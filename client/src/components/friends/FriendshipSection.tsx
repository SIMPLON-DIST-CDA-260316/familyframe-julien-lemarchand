import type { JSX, ReactNode } from 'react'
import { FriendshipRow } from '@/components/friends/FriendshipRow.tsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx'
import type { Friendship } from '@/friendship.ts'

type FriendshipSectionProps = {
  title: string
  friendships: Friendship[]
  emptyText: string
  renderActions?: (friendship: Friendship) => ReactNode
}

// One card per list: the three lists differ only by their title and their buttons.
export function FriendshipSection({
  title,
  friendships,
  emptyText,
  renderActions,
}: FriendshipSectionProps): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {friendships.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <ul className="divide-y">
            {friendships.map((friendship) => (
              <FriendshipRow key={friendship.id} friendship={friendship}>
                {renderActions?.(friendship)}
              </FriendshipRow>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
