import { SearchIcon } from 'lucide-react'
import { type JSX, useState } from 'react'
import { Link } from 'react-router'
import { FriendPicker } from '@/components/sharing/FriendPicker.tsx'
import { FRIEND_SEARCH_MIN_COUNT, filterFriends } from '@/components/sharing/friendSearch.ts'
import { sendButtonLabel } from '@/components/sharing/shareTexts.ts'
import { Alert, AlertDescription } from '@/components/ui/alert.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import type { Friendship } from '@/friendship.ts'
import { useFriendships } from '@/hooks/useFriendships.ts'
import { type ShareTarget, useShareSending } from '@/hooks/useShareSending.ts'

type ShareFriendsFormProps = {
  target: ShareTarget
  onSent: () => void
}

type FriendSelectionProps = ShareFriendsFormProps & {
  friends: Friendship[]
}

type FriendSearchFieldProps = {
  query: string
  onQueryChange: (query: string) => void
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

function FriendSearchField({ query, onQueryChange }: FriendSearchFieldProps): JSX.Element {
  return (
    <div className="relative">
      <SearchIcon
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        className="pl-9"
        placeholder="Rechercher un ami"
        aria-label="Rechercher un ami"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
      />
    </div>
  )
}

function toggledIds(ids: string[], friendId: string): string[] {
  return ids.includes(friendId) ? ids.filter((id) => id !== friendId) : [...ids, friendId]
}

function selectedUsers(friends: Friendship[], selectedIds: string[]): Friendship['user'][] {
  return friends.map(({ user }) => user).filter(({ id }) => selectedIds.includes(id))
}

// The selection survives the search: a friend chosen then filtered out is still sent the photo.
function FriendSelection({ friends, target, onSent }: FriendSelectionProps): JSX.Element {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const sending = useShareSending(target, onSent)

  return (
    <div className="flex flex-col gap-4">
      {friends.length >= FRIEND_SEARCH_MIN_COUNT && (
        <FriendSearchField query={query} onQueryChange={setQuery} />
      )}
      <FriendPicker
        friends={filterFriends(friends, query)}
        query={query}
        selectedIds={selectedIds}
        isDisabled={sending.isSending}
        onToggle={(friendId) => setSelectedIds((ids) => toggledIds(ids, friendId))}
      />
      {sending.error && <ErrorAlert message={sending.error} />}
      <Button
        size="lg"
        disabled={selectedIds.length === 0 || sending.isSending}
        onClick={() => sending.sendTo(selectedUsers(friends, selectedIds))}
      >
        {sending.isSending ? 'Envoi…' : sendButtonLabel(selectedIds.length)}
      </Button>
    </div>
  )
}

// Pending requests cannot receive: accepted friends only.
export function ShareFriendsForm({ target, onSent }: ShareFriendsFormProps): JSX.Element {
  const { friendships, isLoading, error } = useFriendships()
  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>
  if (error) return <ErrorAlert message={error} />
  if (friendships.friends.length === 0) return <NoFriends />
  return <FriendSelection friends={friendships.friends} target={target} onSent={onSent} />
}
