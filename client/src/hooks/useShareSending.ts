import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthContext.ts'
import {
  failureMessages,
  firstName,
  type ShareOutcome,
  sentTitle,
  sharedNames,
} from '@/components/sharing/shareTexts.ts'
import type { FriendUser } from '@/friendship.ts'
import type { Photo } from '@/photo.ts'
import { postDeviceShare, postLibraryShare, type ShareResult } from '@/photosApi.ts'

export type ShareTarget = { kind: 'library'; photo: Photo } | { kind: 'device'; file: File }

export type ShareSending = {
  isSending: boolean
  error: string
  sendTo: (friends: FriendUser[], message: string) => Promise<void>
}

function postShare(target: ShareTarget, friendId: string, message: string): Promise<ShareResult> {
  return target.kind === 'library'
    ? postLibraryShare(target.photo.id, friendId, message)
    : postDeviceShare(target.file, friendId, message)
}

// One friend after the other: a device share uploads the whole file each time. null: the
// session ended, nothing more can be sent.
async function shareWithEach(
  target: ShareTarget,
  friends: FriendUser[],
  message: string,
): Promise<ShareOutcome[] | null> {
  const outcomes: ShareOutcome[] = []
  for (const friend of friends) {
    const result = await postShare(target, friend.id, message)
    if (result.status === 'unauthenticated') return null
    outcomes.push({ ...result, name: firstName(friend.displayName) })
  }
  return outcomes
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
    const outcomes = await shareWithEach(target, friends, message)
    setIsSending(false)
    // The session ended on the server: RequireAuth sends the user to /login.
    if (outcomes === null) {
      dropUser()
      return
    }
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
