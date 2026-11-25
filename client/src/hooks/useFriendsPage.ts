import { useState } from 'react'
import type { FriendsView } from '@/components/friends/FriendsViewToggle.tsx'
import type { FriendRequestResult } from '@/friendshipsApi.ts'
import { type FriendshipActions, useFriendshipActions } from '@/hooks/useFriendshipActions.ts'

type FriendRequestSuccess = Extract<FriendRequestResult, { isSuccess: true }>

export type FriendsPageState = {
  actions: FriendshipActions
  isDialogOpen: boolean
  setIsDialogOpen: (isOpen: boolean) => void
  // null until the user picks one: then a received request opens « En attente ».
  view: FriendsView | null
  setView: (view: FriendsView) => void
  notice: string
  handleRequestDone: (result: FriendRequestResult) => void
}

// Their request was waiting: mine accepted it, there is nothing left to wait for.
function successNotice({ friendName, isAccepted }: FriendRequestSuccess): string {
  return isAccepted
    ? `Vous êtes maintenant amis avec ${friendName}.`
    : `Demande envoyée à ${friendName}.`
}

export function useFriendsPage(reload: () => Promise<void>): FriendsPageState {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [view, setView] = useState<FriendsView | null>(null)
  const [notice, setNotice] = useState('')
  // A list action makes the last success notice stale.
  const actions = useFriendshipActions(async () => {
    setNotice('')
    await reload()
  })

  // A failed request keeps the dialog open: its error shows there. A success shows the list
  // the friend is now in.
  function handleRequestDone(result: FriendRequestResult): void {
    actions.clearError()
    reload()
    if (!result.isSuccess) return
    setIsDialogOpen(false)
    setNotice(successNotice(result))
    setView(result.isAccepted ? 'friends' : 'pending')
  }

  return { actions, isDialogOpen, setIsDialogOpen, view, setView, notice, handleRequestDone }
}
