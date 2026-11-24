import type { JSX, ReactNode } from 'react'
import type { Friendship } from '@/friendship.ts'

type FriendshipRowProps = {
  friendship: Friendship
  // The buttons depend on the list: accept and refuse, cancel, or remove.
  children?: ReactNode
}

// The email tells two « Mamie » apart.
export function FriendshipRow({ friendship, children }: FriendshipRowProps): JSX.Element {
  const { displayName, email } = friendship.user
  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-medium">{displayName}</span>
        <span className="truncate text-sm text-muted-foreground">{email}</span>
      </div>
      <div className="flex shrink-0 gap-2">{children}</div>
    </li>
  )
}
