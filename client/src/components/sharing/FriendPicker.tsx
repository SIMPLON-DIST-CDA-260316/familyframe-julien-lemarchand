import { CheckIcon } from 'lucide-react'
import type { JSX } from 'react'
import { UserAvatar } from '@/components/auth/UserAvatar.tsx'
import { firstName } from '@/components/sharing/shareTexts.ts'
import type { Friendship, FriendUser } from '@/friendship.ts'

type FriendPickerProps = {
  friends: Friendship[]
  query: string
  selectedIds: string[]
  isDisabled: boolean
  onToggle: (friendId: string) => void
}

type FriendToggleProps = {
  friend: FriendUser
  isSelected: boolean
  isDisabled: boolean
  onToggle: (friendId: string) => void
}

function FriendToggle({
  friend,
  isSelected,
  isDisabled,
  onToggle,
}: FriendToggleProps): JSX.Element {
  return (
    // The full name for hover and screen readers: it tells two « Jean » apart.
    <button
      type="button"
      aria-pressed={isSelected}
      aria-label={friend.displayName}
      title={friend.displayName}
      disabled={isDisabled}
      onClick={() => onToggle(friend.id)}
      className="group flex w-full flex-col items-center gap-1.5 rounded-xl p-2 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
    >
      <span className="relative">
        <UserAvatar
          name={friend.displayName}
          avatarUrl={friend.avatarUrl}
          className="size-14 bg-muted text-lg text-foreground ring-offset-2 ring-offset-popover group-aria-pressed:ring-2 group-aria-pressed:ring-primary"
        />
        <span
          aria-hidden
          className="absolute -right-0.5 -bottom-0.5 hidden size-5 place-items-center rounded-full bg-primary text-primary-foreground ring-2 ring-popover group-aria-pressed:grid"
        >
          <CheckIcon className="size-3" />
        </span>
      </span>
      <span className="w-full truncate text-center text-sm">{firstName(friend.displayName)}</span>
    </button>
  )
}

export function FriendPicker({
  friends,
  query,
  selectedIds,
  isDisabled,
  onToggle,
}: FriendPickerProps): JSX.Element {
  if (friends.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Aucun ami ne correspond à « {query.trim()} ».</p>
    )
  }
  return (
    // Scrolls on its own: with many friends, the send button stays in reach.
    <ul className="grid max-h-64 grid-cols-[repeat(auto-fill,minmax(5rem,1fr))] gap-1 overflow-y-auto">
      {friends.map(({ user }) => (
        <li key={user.id}>
          <FriendToggle
            friend={user}
            isSelected={selectedIds.includes(user.id)}
            isDisabled={isDisabled}
            onToggle={onToggle}
          />
        </li>
      ))}
    </ul>
  )
}
