import type { JSX, ReactNode } from 'react'
import { FriendshipRow } from '@/components/friends/FriendshipRow.tsx'
import type { Friendship } from '@/friendship.ts'

type FriendshipSectionProps = {
  // Optional: a list alone in its view needs no heading.
  title?: string
  friendships: Friendship[]
  // Shown instead of the list when it is empty.
  emptyState?: ReactNode
  renderActions?: (friendship: Friendship) => ReactNode
}

// The three lists differ only by their title, their buttons and their empty state.
export function FriendshipSection({
  title,
  friendships,
  emptyState,
  renderActions,
}: FriendshipSectionProps): JSX.Element {
  return (
    <section className="flex flex-col gap-3">
      {title && (
        <h2 className="text-sm font-medium text-muted-foreground">
          {title} <span className="tabular-nums">· {friendships.length}</span>
        </h2>
      )}
      {friendships.length === 0 ? (
        emptyState
      ) : (
        <ul className="divide-y rounded-xl border">
          {friendships.map((friendship) => (
            <FriendshipRow key={friendship.id} friendship={friendship}>
              {renderActions?.(friendship)}
            </FriendshipRow>
          ))}
        </ul>
      )}
    </section>
  )
}
