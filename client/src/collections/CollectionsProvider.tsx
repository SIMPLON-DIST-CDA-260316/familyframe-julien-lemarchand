import {
  type Dispatch,
  type JSX,
  type ReactNode,
  type SetStateAction,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useAuth } from '@/auth/AuthContext.ts'
import {
  CollectionsContext,
  type CollectionsContextValue,
  type CollectionsStatus,
} from '@/collections/CollectionsContext.ts'
import { type Collection, withCollection } from '@/collections/collection.ts'
import {
  type CollectionDeletion,
  type CollectionResult,
  deleteCollection,
  deleteCollectionPhoto,
  fetchCollections,
  patchCollection,
  postCollection,
  postCollectionPhotos,
  putCollectionPhoto,
} from '@/collections/collectionsApi.ts'
import { connectPhotoSocket } from '@/photoSocket.ts'

type CollectionsState = { collections: Collection[]; status: CollectionsStatus }

type SetState = Dispatch<SetStateAction<CollectionsState>>

type CollectionActions = Omit<CollectionsContextValue, 'collections' | 'status'>

type CollectionsLoader = { load: () => Promise<void>; stop: () => void }

// Only the latest load applies its answer: an older one may have left before a change.
function createCollectionsLoader(setState: SetState, dropUser: () => void): CollectionsLoader {
  let latestLoadId = 0
  return {
    load: async () => {
      latestLoadId += 1
      const loadId = latestLoadId
      const result = await fetchCollections(() => {
        if (loadId === latestLoadId) dropUser()
      })
      if (loadId !== latestLoadId) return
      setState((current) => {
        if (result.isSuccess) return { collections: result.collections, status: 'loaded' }
        return current.status === 'loaded' ? current : { ...current, status: 'failed' }
      })
    },
    stop: () => {
      latestLoadId += 1
    },
  }
}

// Returns the cleanup that stops the socket and any load still running.
function connectCollections(setState: SetState, dropUser: () => void): () => void {
  const loader = createCollectionsLoader(setState, dropUser)
  // A deleted photo leaves its collections too: the server answers them without it.
  const socket = connectPhotoSocket({
    onConnect: loader.load,
    onCollectionsChanged: loader.load,
    onDeletedPhoto: loader.load,
    onRefused: dropUser,
  })
  return () => {
    socket.disconnect()
    loader.stop()
  }
}

// The answer applies at once: collections:changed reloads the list on the other pages.
function applyResult(setState: SetState, result: CollectionResult): CollectionResult {
  if (result.isSuccess) {
    const { collection } = result
    setState((current) => ({
      ...current,
      collections: withCollection(current.collections, collection),
    }))
  }
  return result
}

async function removeCollection(
  setState: SetState,
  id: string,
  dropUser: () => void,
): Promise<CollectionDeletion> {
  const result = await deleteCollection(id, dropUser)
  if (result.isSuccess) {
    setState((current) => ({
      ...current,
      collections: current.collections.filter((collection) => collection.id !== id),
    }))
  }
  return result
}

function useCollectionActions(setState: SetState, dropUser: () => void): CollectionActions {
  return useMemo(() => {
    const apply = (result: CollectionResult): CollectionResult => applyResult(setState, result)
    return {
      create: async (name) => apply(await postCollection(name, dropUser)),
      rename: async (id, name) => apply(await patchCollection(id, name, dropUser)),
      remove: (id) => removeCollection(setState, id, dropUser),
      addPhoto: async (id, photoId) => apply(await putCollectionPhoto(id, photoId, dropUser)),
      addPhotos: async (id, photoIds) => apply(await postCollectionPhotos(id, photoIds, dropUser)),
      removePhoto: async (id, photoId) => apply(await deleteCollectionPhoto(id, photoId, dropUser)),
    }
  }, [setState, dropUser])
}

// Mounted behind RequireAuth: the library, the menus and the frame share one list.
export function CollectionsProvider({ children }: { children: ReactNode }): JSX.Element {
  const { dropUser } = useAuth()
  const [state, setState] = useState<CollectionsState>({ collections: [], status: 'loading' })
  const actions = useCollectionActions(setState, dropUser)

  useEffect(() => connectCollections(setState, dropUser), [dropUser])

  const value = useMemo(() => ({ ...state, ...actions }), [state, actions])

  return <CollectionsContext value={value}>{children}</CollectionsContext>
}
