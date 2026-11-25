import { type Dispatch, type SetStateAction, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthContext.ts'
import { type UploadTally, uploadSummary } from '@/components/library/uploadTexts.ts'
import { type UploadedHandler, useLibraryUpload } from '@/hooks/useLibraryUpload.ts'
import type { PhotoLibrary } from '@/hooks/usePhotoLibrary.ts'
import { postPhoto } from '@/photosApi.ts'

// collectionId: the view the photo was chosen from, where its tile shows. progress null: still
// waiting its turn.
export type PendingUpload = {
  id: number
  file: File
  collectionId: string | null
  progress: number | null
}

export type PhotoUploads = {
  // Only the uploads chosen from the view shown: a tile stays where its photo was wanted.
  pending: PendingUpload[]
  enqueue: (files: File[]) => void
}

type UploadOutcome =
  | { status: 'added'; collectionName: string | null }
  | { status: 'refused' }
  | { status: 'unauthenticated' }

const EMPTY_TALLY: UploadTally = { addedCount: 0, refusedCount: 0, collectionName: null }

type SetPending = Dispatch<SetStateAction<PendingUpload[]>>

function updateProgress(setPending: SetPending, id: number, progress: number): void {
  setPending((current) =>
    current.map((upload) => (upload.id === id ? { ...upload, progress } : upload)),
  )
}

// The tile leaves as the answer arrives, in the same render as the real photo: never both.
async function uploadOne(
  upload: PendingUpload,
  setPending: SetPending,
  onUploaded: UploadedHandler,
): Promise<UploadOutcome> {
  updateProgress(setPending, upload.id, 0)
  const result = await postPhoto(upload.file, (percent) =>
    updateProgress(setPending, upload.id, percent),
  )
  setPending((current) => current.filter(({ id }) => id !== upload.id))
  if (result.status === 'unauthenticated') return result
  if (result.status === 'failed') {
    toast.error(result.message, { description: upload.file.name })
    return { status: 'refused' }
  }
  const collectionName = await onUploaded(result.photo, upload.collectionId)
  return { status: 'added', collectionName }
}

function withOutcome(tally: UploadTally, outcome: UploadOutcome): UploadTally {
  if (outcome.status === 'refused') return { ...tally, refusedCount: tally.refusedCount + 1 }
  if (outcome.status === 'unauthenticated') return tally
  const collectionName = outcome.collectionName ?? tally.collectionName
  return { ...tally, addedCount: tally.addedCount + 1, collectionName }
}

function announceTally(tally: UploadTally): void {
  const summary = uploadSummary(tally)
  if (summary === null) return
  if (tally.refusedCount === 0) toast.success(summary)
  else if (tally.addedCount === 0) toast.error(summary)
  else toast.warning(summary)
}

// Mutable on purpose, like liveLoads: the queue's steps read and change it between renders.
type QueueState = {
  chain: Promise<void>
  nextId: number
  waitingCount: number
  tally: UploadTally
  isStopped: boolean
}

type QueueContext = {
  state: QueueState
  setPending: SetPending
  onUploaded: UploadedHandler
  dropUser: () => void
}

function createQueueState(): QueueState {
  return {
    chain: Promise.resolve(),
    nextId: 0,
    waitingCount: 0,
    tally: EMPTY_TALLY,
    isStopped: false,
  }
}

async function runUpload(context: QueueContext, upload: PendingUpload): Promise<void> {
  const { state, setPending, onUploaded, dropUser } = context
  if (state.isStopped) return
  const outcome = await uploadOne(upload, setPending, onUploaded)
  // The session ended on the server: RequireAuth sends the user to /login, the rest is dropped.
  if (outcome.status === 'unauthenticated') {
    state.isStopped = true
    setPending([])
    dropUser()
    return
  }
  state.tally = withOutcome(state.tally, outcome)
  state.waitingCount -= 1
  if (state.waitingCount > 0) return
  announceTally(state.tally)
  state.tally = EMPTY_TALLY
}

// One upload at a time, in the order chosen: each waits for the previous one through the chain.
// The summary comes once the queue is empty, however many choices filled it.
function enqueueUploads(context: QueueContext, files: File[], collectionId: string | null): void {
  const { state, setPending } = context
  const uploads = files.map((file) => ({ id: state.nextId++, file, collectionId, progress: null }))
  state.waitingCount += uploads.length
  setPending((current) => [...current, ...uploads])
  for (const upload of uploads) {
    state.chain = state.chain.then(() => runUpload(context, upload))
  }
}

export function usePhotoUploads(collectionId: string | null, library: PhotoLibrary): PhotoUploads {
  const { dropUser } = useAuth()
  const onUploaded = useLibraryUpload(library)
  const [pending, setPending] = useState<PendingUpload[]>([])
  // useState keeps one queue across renders.
  const [state] = useState(createQueueState)
  const context = { state, setPending, onUploaded, dropUser }
  return {
    pending: pending.filter((upload) => upload.collectionId === collectionId),
    enqueue: (files) => enqueueUploads(context, files, collectionId),
  }
}
