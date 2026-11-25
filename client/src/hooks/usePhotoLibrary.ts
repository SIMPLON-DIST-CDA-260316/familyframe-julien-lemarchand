import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useAuth } from '@/auth/AuthContext.ts'
import { createLiveLoads, type LiveLoads } from '@/liveLoads.ts'
import type { Photo } from '@/photo.ts'
import { withNewPhoto, withOlderPhotos, withoutPhoto } from '@/photoList.ts'
import { connectPhotoSocket, type PhotoSocketHandlers } from '@/photoSocket.ts'
import { fetchNewestPhotos, fetchPhotoPage } from '@/photosApi.ts'

// The server's DEFAULT_PAGE_SIZE: the first load asks for one page.
const FIRST_LOAD_COUNT = 30

export type PhotoLibrary = {
  photos: Photo[]
  hasMore: boolean
  isLoadingMore: boolean
  // false until the first page arrives: an empty list then means an empty library.
  isFirstPageLoaded: boolean
  loadMore: () => Promise<void>
  addPhoto: (photo: Photo) => void
}

// null: the whole library; otherwise only the photos of that collection.
export type CollectionFilter = string | null

// The load that gave the cursor: a page fetched with it is only valid while that load is current.
// It also keeps the collection the cursor walks through.
type NextPage = { cursor: string; loadId: number; collectionId: CollectionFilter }

type LibrarySetters = {
  setPhotos: Dispatch<SetStateAction<Photo[]>>
  setNextPage: Dispatch<SetStateAction<NextPage | null>>
}

type FirstPageSetters = LibrarySetters & {
  setIsFirstPageLoaded: Dispatch<SetStateAction<boolean>>
}

type MoreSetters = LibrarySetters & {
  setIsLoadingMore: Dispatch<SetStateAction<boolean>>
}

type LibraryStore = FirstPageSetters &
  MoreSetters & {
    photos: Photo[]
    nextPage: NextPage | null
    isLoadingMore: boolean
    isFirstPageLoaded: boolean
  }

function toNextPage(
  cursor: string | null,
  loadId: number,
  collectionId: CollectionFilter,
): NextPage | null {
  return cursor === null ? null : { cursor, loadId, collectionId }
}

// Each (re)connection reloads from the newest photo, which catches what changed offline. It asks
// for as many photos as were loaded: the viewer's photo, pages deep, stays in the list.
function createFirstPageLoader(
  liveLoads: LiveLoads,
  { setPhotos, setNextPage, setIsFirstPageLoaded }: FirstPageSetters,
  readLoadCount: () => number,
  collectionId: CollectionFilter,
  dropUser: () => void,
): () => Promise<void> {
  return async () => {
    const loadId = liveLoads.begin()
    const page = await fetchNewestPhotos(readLoadCount(), collectionId ?? undefined, () => {
      if (liveLoads.isCurrent(loadId)) dropUser()
    })
    if (page === null || !liveLoads.isCurrent(loadId)) return
    setPhotos(liveLoads.withLiveChanges(page.photos))
    setNextPage(toNextPage(page.nextCursor, loadId, collectionId))
    setIsFirstPageLoaded(true)
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
    const { cursor, loadId, collectionId } = nextPage
    setIsLoadingMore(true)
    const request = { cursor, collectionId: collectionId ?? undefined }
    const page = await fetchPhotoPage(request, () => {
      if (liveLoads.isCurrent(loadId)) dropUser()
    })
    setIsLoadingMore(false)
    if (page === null || !liveLoads.isCurrent(loadId)) return
    setPhotos((current) => withOlderPhotos(current, liveLoads.withoutDeleted(page.photos)))
    setNextPage(toNextPage(page.nextCursor, loadId, collectionId))
  }
}

// The upload response and the photo:new event bring the same photo: withNewPhoto keeps one.
function createPhotoAdder(
  liveLoads: LiveLoads,
  setPhotos: Dispatch<SetStateAction<Photo[]>>,
): (photo: Photo) => void {
  return (photo) => {
    liveLoads.rememberAdded(photo)
    setPhotos((current) => withNewPhoto(current, photo))
  }
}

// A collection listens to collections:changed rather than to new photos: a photo enters it only
// by being filed there.
function libraryHandlers(
  liveLoads: LiveLoads,
  setPhotos: Dispatch<SetStateAction<Photo[]>>,
  loadFirstPage: () => Promise<void>,
  collectionId: CollectionFilter,
): Omit<PhotoSocketHandlers, 'onRefused'> {
  const addPhoto = collectionId === null ? createPhotoAdder(liveLoads, setPhotos) : undefined
  return {
    onConnect: loadFirstPage,
    // A received photo joins the library once opened, here or on another device.
    onNewPhoto: addPhoto,
    onOpenedPhoto: addPhoto,
    onCollectionsChanged: collectionId === null ? undefined : loadFirstPage,
    // The delete dialog relies on this event, as on the frame.
    onDeletedPhoto: (id) => {
      liveLoads.rememberDeleted(id)
      setPhotos((current) => withoutPhoto(current, id))
    },
  }
}

// Returns the cleanup that stops the socket and any load still running.
function connectLibrary(
  liveLoads: LiveLoads,
  setters: FirstPageSetters,
  readLoadCount: () => number,
  collectionId: CollectionFilter,
  dropUser: () => void,
): () => void {
  const loadFirstPage = createFirstPageLoader(
    liveLoads,
    setters,
    readLoadCount,
    collectionId,
    dropUser,
  )
  const handlers = libraryHandlers(liveLoads, setters.setPhotos, loadFirstPage, collectionId)
  const socket = connectPhotoSocket({ ...handlers, onRefused: dropUser })
  return () => {
    socket.disconnect()
    liveLoads.stop()
  }
}

// A collection's list waits for collections:changed: an upload enters it once filed there.
function usePhotoAdder(
  liveLoads: LiveLoads,
  setPhotos: Dispatch<SetStateAction<Photo[]>>,
  collectionId: CollectionFilter,
): (photo: Photo) => void {
  return useMemo(
    () => (collectionId === null ? createPhotoAdder(liveLoads, setPhotos) : () => {}),
    [liveLoads, setPhotos, collectionId],
  )
}

// Rebuilt when the next page changes, so loadMore always fetches the page after the current one.
function useMoreLoader(
  liveLoads: LiveLoads,
  nextPage: NextPage | null,
  setters: MoreSetters,
  dropUser: () => void,
): () => Promise<void> {
  const { setPhotos, setNextPage, setIsLoadingMore } = setters
  return useMemo(() => {
    const stableSetters = { setPhotos, setNextPage, setIsLoadingMore }
    return createMoreLoader(liveLoads, nextPage, stableSetters, dropUser)
  }, [liveLoads, nextPage, setPhotos, setNextPage, setIsLoadingMore, dropUser])
}

// A ref, not state: the socket's reconnect reads it without reconnecting when it changes.
function useLoadCountReader(photos: Photo[]): () => number {
  const loadedCount = useRef(0)
  useEffect(() => {
    loadedCount.current = photos.length
  }, [photos])
  return useCallback(() => Math.max(loadedCount.current, FIRST_LOAD_COUNT), [])
}

// Another collection reconnects: its first load asks for its own photos.
function useLibraryConnection(
  liveLoads: LiveLoads,
  { photos, setPhotos, setNextPage, setIsFirstPageLoaded }: LibraryStore,
  collectionId: CollectionFilter,
  dropUser: () => void,
): void {
  const readLoadCount = useLoadCountReader(photos)
  useEffect(() => {
    const setters = { setPhotos, setNextPage, setIsFirstPageLoaded }
    return connectLibrary(liveLoads, setters, readLoadCount, collectionId, dropUser)
  }, [
    liveLoads,
    readLoadCount,
    setPhotos,
    setNextPage,
    setIsFirstPageLoaded,
    collectionId,
    dropUser,
  ])
}

// Another collection starts empty, adjusted during render: its first frame never shows the
// previous photos, and its first load asks for one page, not for as many as were shown.
function useLibraryStore(collectionId: CollectionFilter): LibraryStore {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [nextPage, setNextPage] = useState<NextPage | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isFirstPageLoaded, setIsFirstPageLoaded] = useState(false)
  const [shownCollectionId, setShownCollectionId] = useState(collectionId)
  if (shownCollectionId !== collectionId) {
    setShownCollectionId(collectionId)
    setPhotos([])
    setNextPage(null)
    setIsFirstPageLoaded(false)
  }
  const state = { photos, nextPage, isLoadingMore, isFirstPageLoaded }
  return { ...state, setPhotos, setNextPage, setIsLoadingMore, setIsFirstPageLoaded }
}

export function usePhotoLibrary(collectionId: CollectionFilter): PhotoLibrary {
  const { dropUser } = useAuth()
  // useState keeps one instance across renders: its load bookkeeping must survive them.
  const [liveLoads] = useState(createLiveLoads)
  const store = useLibraryStore(collectionId)
  useLibraryConnection(liveLoads, store, collectionId, dropUser)
  const loadMore = useMoreLoader(liveLoads, store.nextPage, store, dropUser)
  const addPhoto = usePhotoAdder(liveLoads, store.setPhotos, collectionId)
  return {
    photos: store.photos,
    hasMore: store.nextPage !== null,
    isLoadingMore: store.isLoadingMore,
    isFirstPageLoaded: store.isFirstPageLoaded,
    loadMore,
    addPhoto,
  }
}
