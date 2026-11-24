import { useState } from 'react'
import { useAuth } from '@/auth/AuthContext.ts'
import type { Photo } from '@/photo.ts'
import { postDeviceShare, postLibraryShare, type ShareResult } from '@/photosApi.ts'

// Until the share sheet replaces this dialog: the message the API's duplicate used to give.
const SHARE_DUPLICATE_MESSAGE = 'Cette personne a déjà cette photo.'

export type ShareTarget = { kind: 'library'; photo: Photo } | { kind: 'device'; file: File }

// Keyed by the friend's user id: one dialog may send to several friends.
export type FriendShares = {
  sendingIds: string[]
  sentIds: string[]
  error: string
  send: (friendId: string) => Promise<void>
}

function postShare(target: ShareTarget, friendId: string): Promise<ShareResult> {
  return target.kind === 'library'
    ? postLibraryShare(target.photo.id, friendId)
    : postDeviceShare(target.file, friendId)
}

export function useFriendShares(target: ShareTarget, onShared?: () => void): FriendShares {
  const { dropUser } = useAuth()
  const [sendingIds, setSendingIds] = useState<string[]>([])
  const [sentIds, setSentIds] = useState<string[]>([])
  const [error, setError] = useState('')

  async function send(friendId: string): Promise<void> {
    setSendingIds((ids) => [...ids, friendId])
    setError('')
    const result = await postShare(target, friendId)
    setSendingIds((ids) => ids.filter((id) => id !== friendId))
    // The session ended on the server: RequireAuth sends the user to /login.
    if (result.status === 'unauthenticated') {
      dropUser()
      return
    }
    if (result.status === 'failed') {
      setError(result.message)
      return
    }
    if (result.status === 'duplicate') {
      setError(SHARE_DUPLICATE_MESSAGE)
      return
    }
    setSentIds((ids) => [...ids, friendId])
    onShared?.()
  }

  return { sendingIds, sentIds, error, send }
}
