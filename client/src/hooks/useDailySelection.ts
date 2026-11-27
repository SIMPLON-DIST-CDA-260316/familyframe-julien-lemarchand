import { type Dispatch, type SetStateAction, useEffect, useState } from 'react'
import { useAuth } from '@/auth/AuthContext.ts'
import { connectPhotoSocket } from '@/photoSocket.ts'
import type { SelectedIds } from '@/selections/selection.ts'
import { fetchDailySelection } from '@/selections/selectionsApi.ts'

// Midnight sends no event: a check every quarter of an hour picks up the new day's lot.
const DAY_CHECK_MS = 15 * 60 * 1000

type SetIds = Dispatch<SetStateAction<SelectedIds>>

type DailyLoader = { load: () => Promise<void>; stop: () => void }

// Only the latest load applies its answer. A failed reload keeps the lot on screen.
function createDailyLoader(setIds: SetIds, dropUser: () => void): DailyLoader {
  let latestLoadId = 0
  return {
    load: async () => {
      latestLoadId += 1
      const loadId = latestLoadId
      const selection = await fetchDailySelection(() => {
        if (loadId === latestLoadId) dropUser()
      })
      if (loadId !== latestLoadId) return
      setIds((current) => {
        if (selection) return { status: 'ready', photoIds: selection.photoIds }
        return current.status === 'ready' ? current : { status: 'unavailable' }
      })
    },
    stop: () => {
      latestLoadId += 1
    },
  }
}

// A photo added, opened or deleted may change the lot: the server draws it again. Returns the
// cleanup, which also forgets the lot: the next start waits for a fresh one.
function connectDailySelection(setIds: SetIds, dropUser: () => void): () => void {
  const loader = createDailyLoader(setIds, dropUser)
  const socket = connectPhotoSocket({
    onConnect: loader.load,
    onNewPhoto: loader.load,
    onOpenedPhoto: loader.load,
    onDeletedPhoto: loader.load,
    onRefused: dropUser,
  })
  const timer = setInterval(loader.load, DAY_CHECK_MS)
  return () => {
    socket.disconnect()
    clearInterval(timer)
    loader.stop()
    setIds({ status: 'loading' })
  }
}

// Asks the server only while the frame plays the day's selection.
export function useDailySelection(isEnabled: boolean): SelectedIds {
  const { dropUser } = useAuth()
  const [ids, setIds] = useState<SelectedIds>({ status: 'loading' })

  useEffect(() => {
    if (!isEnabled) return
    return connectDailySelection(setIds, dropUser)
  }, [isEnabled, dropUser])

  return ids
}
