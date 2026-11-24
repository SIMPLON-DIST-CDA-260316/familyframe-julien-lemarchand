import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useAuth } from '@/auth/AuthContext.ts'
import { createLiveLoads, type LiveLoads } from '@/liveLoads.ts'
import type { Photo } from '@/photo.ts'
import { withNewPhoto, withOlderPhotos, withoutPhoto } from '@/photoList.ts'
import { connectPhotoSocket } from '@/photoSocket.ts'
import { fetchPhotoPage } from '@/photosApi.ts'

export type PhotoLibrary = {
  photos: Photo[]
  hasMore: boolean
  isLoadingMore: boolean
  loadMore: () => Promise<void>
  addPhoto: (photo: Photo) => void
}

type LibrarySetters = {
  setPhotos: Dispatch<SetStateAction<Photo[]>>
  setNextCursor: Dispatch<SetStateAction<string | null>>
}

type MoreSetters = LibrarySetters & {
  setIsLoadingMore: Dispatch<SetStateAction<boolean>>
}

// Each (re)connection starts over from the first page: simple, and catches what changed offline.
function createFirstPageLoader(
  liveLoads: LiveLoads,
  { setPhotos, setNextCursor }: LibrarySetters,
  dropUser: () => void,
): () => Promise<void> {
  return async () => {
    const loadId = liveLoads.begin()
    const page = await fetchPhotoPage({}, () => {
      if (liveLoads.isCurrent(loadId)) dropUser()
    })
    if (page === null || !liveLoads.isCurrent(loadId)) return
    setPhotos(liveLoads.withLiveChanges(page.photos))
    setNextCursor(page.nextCursor)
  }
}

// Does not begin a load: a reconnect reload or the cleanup makes this page stale, and it is dropped.
function createMoreLoader(
  liveLoads: LiveLoads,
  nextCursor: string | null,
  { setPhotos, setNextCursor, setIsLoadingMore }: MoreSetters,
  dropUser: () => void,
): () => Promise<void> {
  return async () => {
    if (nextCursor === null) return
    const loadId = liveLoads.currentLoadId()
    setIsLoadingMore(true)
    const page = await fetchPhotoPage({ cursor: nextCursor }, () => {
      if (liveLoads.isCurrent(loadId)) dropUser()
    })
    setIsLoadingMore(false)
    if (page === null || !liveLoads.isCurrent(loadId)) return
    setPhotos((current) => withOlderPhotos(current, liveLoads.withoutDeleted(page.photos)))
    setNextCursor(page.nextCursor)
  }
}

// Returns the cleanup that stops the socket and any load still running.
function connectLibrary(
  liveLoads: LiveLoads,
  setters: LibrarySetters,
  dropUser: () => void,
): () => void {
  const { setPhotos } = setters
  const socket = connectPhotoSocket({
    onConnect: createFirstPageLoader(liveLoads, setters, dropUser),
    onNewPhoto: (photo) => {
      liveLoads.rememberAdded(photo)
      setPhotos((current) => withNewPhoto(current, photo))
    },
    // The delete dialog relies on this event, as on the frame.
    onDeletedPhoto: (id) => {
      liveLoads.rememberDeleted(id)
      setPhotos((current) => withoutPhoto(current, id))
    },
    onRefused: dropUser,
  })
  return () => {
    socket.disconnect()
    liveLoads.stop()
  }
}

export function usePhotoLibrary(): PhotoLibrary {
  const { dropUser } = useAuth()
  const [liveLoads] = useState(createLiveLoads)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  useEffect(
    () => connectLibrary(liveLoads, { setPhotos, setNextCursor }, dropUser),
    [liveLoads, dropUser],
  )

  const loadMore = useMemo(() => {
    const setters = { setPhotos, setNextCursor, setIsLoadingMore }
    return createMoreLoader(liveLoads, nextCursor, setters, dropUser)
  }, [liveLoads, nextCursor, dropUser])

  // The upload response and the photo:new event bring the same photo: withNewPhoto keeps one.
  const addPhoto = useCallback((photo: Photo): void => {
    setPhotos((current) => withNewPhoto(current, photo))
  }, [])

  return { photos, hasMore: nextCursor !== null, isLoadingMore, loadMore, addPhoto }
}
