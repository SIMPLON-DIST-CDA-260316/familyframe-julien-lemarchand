import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthContext.ts'
import {
  failureMessages,
  firstName,
  NOT_FRIEND_MESSAGE,
  type ShareOutcome,
  sentTitle,
  sharedNames,
} from '@/components/sharing/shareTexts.ts'
import type { FriendUser } from '@/friendship.ts'
import type { Photo } from '@/photo.ts'
import { postDeviceShare, postLibraryShare, type ShareResult } from '@/photosApi.ts'
import type { SendOutcome } from '@/sentPhoto.ts'
import { preparePhoto } from '@/upload/preparePhoto.ts'

export type ShareTarget = { kind: 'library'; photo: Photo } | { kind: 'device'; file: File }

export type ShareSending = {
  isSending: boolean
  error: string
  sendTo: (friends: FriendUser[], message: string) => Promise<void>
}

function postShare(
  target: ShareTarget,
  friendIds: string[],
  message: string,
): Promise<ShareResult> {
  return target.kind === 'library'
    ? postLibraryShare(target.photo.id, friendIds, message)
    : postDeviceShare(target.file, friendIds, message)
}

// Prepared on the device first: a very large photo would be refused by the server.
async function preparedTarget(target: ShareTarget): Promise<ShareTarget> {
  if (target.kind === 'library') return target
  return { kind: 'device', file: await preparePhoto(target.file) }
}

// The server answers by id; the sheet names each friend.
function namedOutcome(friend: FriendUser, outcomes: SendOutcome[]): ShareOutcome {
  const name = firstName(friend.displayName)
  const status = outcomes.find(({ friendId }) => friendId === friend.id)?.status
  if (status === 'sent') return { name, status: 'shared' }
  if (status === 'duplicate') return { name, status: 'duplicate' }
  return { name, status: 'failed', message: NOT_FRIEND_MESSAGE }
}

function announceSent(names: string[], failures: string[]): void {
  if (failures.length === 0) {
    toast.success(sentTitle(names))
    return
  }
  // Sent to some, not all: the photo did leave, the warning says who is missing.
  toast.warning(sentTitle(names), { description: failures.join(' ') })
}

export function useShareSending(target: ShareTarget, onSent: () => void): ShareSending {
  const { dropUser } = useAuth()
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')

  async function sendTo(friends: FriendUser[], message: string): Promise<void> {
    setIsSending(true)
    setError('')
    const friendIds = friends.map(({ id }) => id)
    const result = await postShare(await preparedTarget(target), friendIds, message)
    setIsSending(false)
    // The session ended on the server: RequireAuth sends the user to /login.
    if (result.status === 'unauthenticated') {
      dropUser()
      return
    }
    if (result.status === 'failed') {
      setError(result.message)
      return
    }
    const outcomes = friends.map((friend) => namedOutcome(friend, result.outcomes))
    const names = sharedNames(outcomes)
    // Nobody got it: the sheet stays open with the reasons, so the choice can change.
    if (names.length === 0) {
      setError(failureMessages(outcomes).join(' '))
      return
    }
    announceSent(names, failureMessages(outcomes))
    onSent()
  }

  return { isSending, error, sendTo }
}
