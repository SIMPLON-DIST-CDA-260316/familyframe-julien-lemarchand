import { useEffect, useState } from 'react'
import { useAuth } from '@/auth/AuthContext.ts'
import type { SelectedIds, Selection } from '@/selections/selection.ts'
import { fetchRadioSelection } from '@/selections/selectionsApi.ts'

// photoId: the radio this answer belongs to. selection: null when it could not load.
type RadioAnswer = { photoId: string; selection: Selection | null }

// Asked once per radio: the suite is built at launch and stays the same. A photo deleted since
// leaves it with the feed; a photo added since does not join it. null: no radio plays.
export function useRadioSelection(photoId: string | null): SelectedIds {
  const { dropUser } = useAuth()
  const [answer, setAnswer] = useState<RadioAnswer | null>(null)

  useEffect(() => {
    if (photoId === null) return
    let isCurrent = true
    fetchRadioSelection(photoId, dropUser).then((selection) => {
      if (isCurrent) setAnswer({ photoId, selection })
    })
    // Stopped, the radio forgets its suite: launched again, it waits for a new one.
    return () => {
      isCurrent = false
      setAnswer(null)
    }
  }, [photoId, dropUser])

  // An answer for another photo is the previous radio's: the new one is still loading.
  if (answer === null || answer.photoId !== photoId) return { status: 'loading' }
  if (answer.selection === null) return { status: 'unavailable' }
  return { status: 'ready', photoIds: answer.selection.photoIds }
}
