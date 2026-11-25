import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthContext.ts'
import { fetchSendPage, removeSend } from '@/sendsApi.ts'
import type { SentPhoto } from '@/sentPhoto.ts'

export type SendHistory = {
  sends: SentPhoto[]
  hasMore: boolean
  // true until the first page answers: an empty list then means no send yet.
  isLoading: boolean
  isLoadingMore: boolean
  error: string
  reload: () => Promise<void>
  loadMore: () => Promise<void>
  remove: (id: string) => Promise<void>
}

type HistoryPages = { sends: SentPhoto[]; nextCursor: string | null }

type HistoryState = {
  pages: HistoryPages
  setPages: Dispatch<SetStateAction<HistoryPages>>
  setIsLoading: Dispatch<SetStateAction<boolean>>
  setIsLoadingMore: Dispatch<SetStateAction<boolean>>
  setError: Dispatch<SetStateAction<string>>
  // Two quick reloads (a send, then another): only the latest may set the list. A page of
  // « Afficher plus » started before a reload belongs to the old list and is dropped too.
  latestLoadId: RefObject<number>
}

const NO_PAGES: HistoryPages = { sends: [], nextCursor: null }

function useReload(state: HistoryState, dropUser: () => void): () => Promise<void> {
  const { setPages, setIsLoading, setError, latestLoadId } = state
  return useCallback(async () => {
    latestLoadId.current += 1
    const loadId = latestLoadId.current
    const result = await fetchSendPage(undefined, dropUser)
    if (loadId !== latestLoadId.current) return
    setIsLoading(false)
    setError(result.isSuccess ? '' : result.message)
    if (result.isSuccess) setPages(result.page)
  }, [setPages, setIsLoading, setError, latestLoadId, dropUser])
}

function useLoadMore(state: HistoryState, dropUser: () => void): () => Promise<void> {
  const { pages, setPages, setIsLoadingMore, latestLoadId } = state
  const { nextCursor } = pages
  return useCallback(async () => {
    if (nextCursor === null) return
    const loadId = latestLoadId.current
    setIsLoadingMore(true)
    const result = await fetchSendPage(nextCursor, dropUser)
    setIsLoadingMore(false)
    if (loadId !== latestLoadId.current) return
    if (!result.isSuccess) {
      toast.error(result.message)
      return
    }
    const { sends, nextCursor: followingCursor } = result.page
    setPages((current) => ({ sends: [...current.sends, ...sends], nextCursor: followingCursor }))
  }, [nextCursor, setPages, setIsLoadingMore, latestLoadId, dropUser])
}

// The row leaves once the server confirms: a failed removal must not hide a line still there.
// Already removed elsewhere: the whole list may be stale, it reloads.
function useRemove(
  setPages: Dispatch<SetStateAction<HistoryPages>>,
  reload: () => Promise<void>,
  dropUser: () => void,
): (id: string) => Promise<void> {
  return useCallback(
    async (id: string) => {
      const result = await removeSend(id, dropUser)
      if (result.status === 'removed') {
        setPages((current) => ({
          ...current,
          sends: current.sends.filter((send) => send.id !== id),
        }))
        return
      }
      toast.error(result.message)
      if (result.status === 'gone') await reload()
    },
    [setPages, reload, dropUser],
  )
}

export function useSendHistory(): SendHistory {
  const { dropUser } = useAuth()
  const [pages, setPages] = useState<HistoryPages>(NO_PAGES)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const latestLoadId = useRef(0)
  const state = { pages, setPages, setIsLoading, setIsLoadingMore, setError, latestLoadId }
  const reload = useReload(state, dropUser)
  const loadMore = useLoadMore(state, dropUser)
  const remove = useRemove(setPages, reload, dropUser)

  useEffect(() => {
    reload()
  }, [reload])

  const hasMore = pages.nextCursor !== null
  return { sends: pages.sends, hasMore, isLoading, isLoadingMore, error, reload, loadMore, remove }
}
