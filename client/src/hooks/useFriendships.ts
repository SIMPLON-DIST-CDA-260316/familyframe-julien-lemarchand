import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/auth/AuthContext.ts'
import type { FriendshipList } from '@/friendship.ts'
import { fetchFriendships } from '@/friendshipsApi.ts'

export type FriendshipsState = {
  friendships: FriendshipList
  isLoading: boolean
  error: string
  reload: () => Promise<void>
}

const NO_FRIENDSHIPS: FriendshipList = { friends: [], incoming: [], outgoing: [] }

export function useFriendships(): FriendshipsState {
  const { dropUser } = useAuth()
  const [friendships, setFriendships] = useState<FriendshipList>(NO_FRIENDSHIPS)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  // Two quick actions start two loads: only the latest one may set the lists.
  const latestLoadId = useRef(0)

  const reload = useCallback(async (): Promise<void> => {
    latestLoadId.current += 1
    const loadId = latestLoadId.current
    const result = await fetchFriendships(dropUser)
    if (loadId !== latestLoadId.current) return
    setIsLoading(false)
    setError(result.isSuccess ? '' : result.message)
    if (result.isSuccess) setFriendships(result.friendships)
  }, [dropUser])

  useEffect(() => {
    reload()
  }, [reload])

  return { friendships, isLoading, error, reload }
}
