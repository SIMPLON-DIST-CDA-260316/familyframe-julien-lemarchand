import { type Dispatch, type SetStateAction, useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/auth/AuthContext.ts'
import { createLiveLoads, type LiveLoads } from '@/liveLoads.ts'
import type { Photo } from '@/photo.ts'
import { withNewPhoto, withoutPhoto } from '@/photoList.ts'
import { fetchUnopenedPhotos, postOpenPhoto } from '@/photoMailApi.ts'
import { connectPhotoSocket } from '@/photoSocket.ts'

export type PhotoMail = {
  // Photos friends sent, not opened yet: newest first, like GET /api/photos/unopened.
  photos: Photo[]
  // The photo leaves the list once the server has opened it; failed, it keeps waiting.
  open: (id: string) => Promise<void>
}

type SetPhotos = Dispatch<SetStateAction<Photo[]>>

function createMailLoader(
  liveLoads: LiveLoads,
  setPhotos: SetPhotos,
  dropUser: () => void,
): () => Promise<void> {
  return async () => {
    const loadId = liveLoads.begin()
    const loadedPhotos = await fetchUnopenedPhotos(() => {
      if (liveLoads.isCurrent(loadId)) dropUser()
    })
    if (loadedPhotos === null || !liveLoads.isCurrent(loadId)) return
    setPhotos(liveLoads.withLiveChanges(loadedPhotos))
  }
}

// Returns the cleanup that stops the socket and any load still running.
function connectPhotoMail(
  liveLoads: LiveLoads,
  setPhotos: SetPhotos,
  dropUser: () => void,
): () => void {
  function removePhoto(id: string): void {
    liveLoads.rememberDeleted(id)
    setPhotos((current) => withoutPhoto(current, id))
  }
  const socket = connectPhotoSocket({
    onConnect: createMailLoader(liveLoads, setPhotos, dropUser),
    onReceivedPhoto: (photo) => {
      liveLoads.rememberAdded(photo)
      setPhotos((current) => withNewPhoto(current, photo))
    },
    // Opened on this device or another one: it stops waiting everywhere.
    onOpenedPhoto: ({ id }) => removePhoto(id),
    onDeletedPhoto: removePhoto,
    onRefused: dropUser,
  })
  return () => {
    socket.disconnect()
    liveLoads.stop()
  }
}

export function usePhotoMail(): PhotoMail {
  const { dropUser } = useAuth()
  // useState keeps one instance across renders: its load bookkeeping must survive them.
  const [liveLoads] = useState(createLiveLoads)
  const [photos, setPhotos] = useState<Photo[]>([])

  useEffect(() => connectPhotoMail(liveLoads, setPhotos, dropUser), [liveLoads, dropUser])

  // photo:opened usually removes it first; the response covers a socket that is down.
  const open = useCallback(
    async (id: string): Promise<void> => {
      const result = await postOpenPhoto(id)
      if (result === 'unauthenticated') dropUser()
      if (result !== 'opened') return
      liveLoads.rememberDeleted(id)
      setPhotos((current) => withoutPhoto(current, id))
    },
    [liveLoads, dropUser],
  )

  return { photos, open }
}
