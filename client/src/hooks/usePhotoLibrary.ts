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

// The load that gave the cursor: a page fetched with it is only valid while that load is current.
type NextPage = { cursor: string; loadId: number }

type LibrarySetters = {
  setPhotos: Dispatch<SetStateAction<Photo[]>>
  setNextPage: Dispatch<SetStateAction<NextPage | null>>
}

type MoreSetters = LibrarySetters & {
  setIsLoadingMore: Dispatch<SetStateAction<boolean>>
}

function toNextPage(cursor: string | null, loadId: number): NextPage | null {
  return cursor === null ? null : { cursor, loadId }
}

// Each (re)connection starts over from the first page: simple, and catches what changed offline.
function createFirstPageLoader(
  liveLoads: LiveLoads,
  { setPhotos, setNextPage }: LibrarySetters,
  dropUser: () => void,
): () => Promise<void> {
  return async () => {
    const loadId = liveLoads.begin()
    const page = await fetchPhotoPage({}, () => {
      if (liveLoads.isCurrent(loadId)) dropUser()
    })
    if (page === null || !liveLoads.isCurrent(loadId)) return
    setPhotos(liveLoads.withLiveChanges(page.photos))
    setNextPage(toNextPage(page.nextCursor, loadId))
  }
}

// Does not begin a load: a reconnect reload or the cleanup makes this page stale, and it is dropped.
function createMoreLoader(
  liveLoads: LiveLoads,
  nextPage: NextPage | null,
  { setPhotos, setNextPage, setIsLoadingMore }: MoreSetters,
  dropUser: () => void,
): () => Promise<void> {
  return async () => {
    if (nextPage === null) return
    const { cursor, loadId } = nextPage
    setIsLoadingMore(true)
    const page = await fetchPhotoPage({ cursor }, () => {
      if (liveLoads.isCurrent(loadId)) dropUser()
    })
    setIsLoadingMore(false)
    if (page === null || !liveLoads.isCurrent(loadId)) return
    setPhotos((current) => withOlderPhotos(current, liveLoads.withoutDeleted(page.photos)))
    setNextPage(toNextPage(page.nextCursor, loadId))
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
  // useState keeps one instance across renders: its load bookkeeping must survive them.
  const [liveLoads] = useState(createLiveLoads)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [nextPage, setNextPage] = useState<NextPage | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  useEffect(
    () => connectLibrary(liveLoads, { setPhotos, setNextPage }, dropUser),
    [liveLoads, dropUser],
  )

  // Rebuilt when the next page changes, so loadMore always fetches the page after the current one.
  const loadMore = useMemo(() => {
    const setters = { setPhotos, setNextPage, setIsLoadingMore }
    return createMoreLoader(liveLoads, nextPage, setters, dropUser)
  }, [liveLoads, nextPage, dropUser])

  // The upload response and the photo:new event bring the same photo: withNewPhoto keeps one.
  const addPhoto = useCallback(
    (photo: Photo): void => {
      liveLoads.rememberAdded(photo)
      setPhotos((current) => withNewPhoto(current, photo))
    },
    [liveLoads],
  )

  return { photos, hasMore: nextPage !== null, isLoadingMore, loadMore, addPhoto }
}
