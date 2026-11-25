import type { Dispatch, SetStateAction } from 'react'
import { toast } from 'sonner'
import { errorMessage } from '@/api.ts'
import { type UploadTally, uploadSummary } from '@/components/library/uploadTexts.ts'
import type { Photo } from '@/photo.ts'
import { postPhoto } from '@/photosApi.ts'
import { preparePhoto } from '@/upload/preparePhoto.ts'

// collectionId: the view the photo was chosen from, where its tile shows. progress null: still
// waiting its turn.
export type PendingUpload = {
  id: number
  file: File
  collectionId: string | null
  progress: number | null
}

// Resolves to the collection's name once filed there, null when nothing was filed.
export type UploadedHandler = (photo: Photo, collectionId: string | null) => Promise<string | null>

export type SetPending = Dispatch<SetStateAction<PendingUpload[]>>

// Mutable on purpose, like liveLoads: the queue's steps read and change it between renders.
// controller: aborts the upload in flight when the queue stops.
export type QueueState = {
  chain: Promise<void>
  nextId: number
  waitingCount: number
  tally: UploadTally
  isStopped: boolean
  controller: AbortController
}

export type QueueContext = {
  state: QueueState
  setPending: SetPending
  onUploaded: UploadedHandler
  dropUser: () => void
}

type UploadOutcome =
  | { status: 'added'; collectionName: string | null }
  | { status: 'refused' }
  | { status: 'unauthenticated' }
  | { status: 'stopped' }

const EMPTY_TALLY: UploadTally = { addedCount: 0, refusedCount: 0, collectionName: null }

export function createQueueState(): QueueState {
  return {
    chain: Promise.resolve(),
    nextId: 0,
    waitingCount: 0,
    tally: EMPTY_TALLY,
    isStopped: false,
    controller: new AbortController(),
  }
}

// StrictMode mounts the provider, unmounts it and mounts it again: each mount gets a live queue.
export function startQueue(state: QueueState): void {
  state.isStopped = false
  state.controller = new AbortController()
}

// The provider leaves with the session (logout, or a session ended elsewhere): the upload in
// flight is aborted and the rest of the chain is dropped, so no photo reaches the next account.
export function stopQueue(state: QueueState): void {
  state.isStopped = true
  state.controller.abort()
}

function updateProgress(setPending: SetPending, id: number, progress: number): void {
  setPending((current) =>
    current.map((upload) => (upload.id === id ? { ...upload, progress } : upload)),
  )
}

function removePending(setPending: SetPending, id: number): void {
  setPending((current) => current.filter((upload) => upload.id !== id))
}

async function uploadOne(context: QueueContext, upload: PendingUpload): Promise<UploadOutcome> {
  const { state, setPending, onUploaded } = context
  updateProgress(setPending, upload.id, 0)
  const file = await preparePhoto(upload.file)
  const { signal } = state.controller
  const onProgress = (percent: number): void => updateProgress(setPending, upload.id, percent)
  const result = await postPhoto(file, onProgress, signal)
  // Logged out meanwhile: no message for an account that left, no filing without its session.
  if (signal.aborted) return { status: 'stopped' }
  if (result.status === 'unauthenticated') return result
  if (result.status === 'failed') {
    toast.error(result.message, { description: upload.file.name })
    return { status: 'refused' }
  }
  const collectionName = await onUploaded(result.photo, upload.collectionId)
  return { status: 'added', collectionName }
}

// The tile leaves once the photo is where it was wanted: in a collection, after the filing. In
// « Toutes » the socket's photo:new often brings the photo just before the answer: both may show
// for a moment, never two photos. A step that throws counts as refused: the queue goes on.
async function settleUpload(context: QueueContext, upload: PendingUpload): Promise<UploadOutcome> {
  try {
    return await uploadOne(context, upload)
  } catch (error: unknown) {
    console.error('Photo upload failed unexpectedly', error)
    if (context.state.isStopped) return { status: 'stopped' }
    toast.error(errorMessage(null), { description: upload.file.name })
    return { status: 'refused' }
  } finally {
    removePending(context.setPending, upload.id)
  }
}

// The collection is named only when every added photo was filed in that same one. Names are
// unique per account, so comparing them compares the collections.
function withOutcome(tally: UploadTally, outcome: UploadOutcome): UploadTally {
  if (outcome.status === 'refused') return { ...tally, refusedCount: tally.refusedCount + 1 }
  if (outcome.status !== 'added') return tally
  const isSamePlace = tally.addedCount === 0 || tally.collectionName === outcome.collectionName
  const collectionName = isSamePlace ? outcome.collectionName : null
  return { ...tally, addedCount: tally.addedCount + 1, collectionName }
}

function announceTally(tally: UploadTally): void {
  const summary = uploadSummary(tally)
  if (summary === null) return
  if (tally.refusedCount === 0) toast.success(summary)
  else if (tally.addedCount === 0) toast.error(summary)
  else toast.warning(summary)
}

async function runUpload(context: QueueContext, upload: PendingUpload): Promise<void> {
  const { state, setPending, dropUser } = context
  if (state.isStopped) return
  const outcome = await settleUpload(context, upload)
  if (outcome.status === 'stopped') return
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
export function enqueueUploads(
  context: QueueContext,
  files: File[],
  collectionId: string | null,
): void {
  const { state, setPending } = context
  const uploads = files.map((file) => ({ id: state.nextId++, file, collectionId, progress: null }))
  state.waitingCount += uploads.length
  setPending((current) => [...current, ...uploads])
  for (const upload of uploads) {
    state.chain = state.chain.then(() => runUpload(context, upload))
  }
}
