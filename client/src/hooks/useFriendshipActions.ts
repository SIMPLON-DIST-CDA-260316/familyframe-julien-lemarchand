import { useState } from 'react'
import { useAuth } from '@/auth/AuthContext.ts'
import {
  deleteFriendship,
  type FriendshipActionResult,
  postAcceptFriendship,
} from '@/friendshipsApi.ts'

export type FriendshipActions = {
  // Ids with a call in flight: their buttons wait, the other rows stay usable.
  busyIds: string[]
  error: string
  accept: (id: string) => Promise<void>
  remove: (id: string) => Promise<void>
}

type SendAction = (id: string, onUnauthenticated: () => void) => Promise<FriendshipActionResult>

export function useFriendshipActions(reload: () => Promise<void>): FriendshipActions {
  const { dropUser } = useAuth()
  const [busyIds, setBusyIds] = useState<string[]>([])
  const [error, setError] = useState('')

  async function run(id: string, send: SendAction): Promise<void> {
    setError('')
    setBusyIds((ids) => [...ids, id])
    const result = await send(id, dropUser)
    setBusyIds((ids) => ids.filter((busyId) => busyId !== id))
    if (!result.isSuccess) setError(result.message)
    // Reload on failure too: a 404 means the other side acted first, the lists are stale.
    await reload()
  }

  return {
    busyIds,
    error,
    accept: (id) => run(id, postAcceptFriendship),
    remove: (id) => run(id, deleteFriendship),
  }
}
