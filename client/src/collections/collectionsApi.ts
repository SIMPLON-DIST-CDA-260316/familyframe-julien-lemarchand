import { errorMessage, UNAUTHORIZED_STATUS } from '@/api.ts'
import { type Collection, isCollection, isCollectionList } from '@/collections/collection.ts'

export type CollectionsResult =
  | { isSuccess: true; collections: Collection[] }
  | { isSuccess: false; message: string }

// Every write but a deletion answers the collection as the server saved it.
export type CollectionResult =
  | { isSuccess: true; collection: Collection }
  | { isSuccess: false; message: string }

export type CollectionDeletion = { isSuccess: true } | { isSuccess: false; message: string }

const JSON_HEADERS = { 'Content-Type': 'application/json' }

// A 401 calls onUnauthenticated: the session ended on the server, the provider drops the user.
export async function fetchCollections(onUnauthenticated: () => void): Promise<CollectionsResult> {
  try {
    const res = await fetch('/api/collections')
    if (res.status === UNAUTHORIZED_STATUS) onUnauthenticated()
    // Not JSON when the dev proxy answers for a stopped API.
    const data: unknown = await res.json().catch(() => null)
    if (res.ok && isCollectionList(data)) return { isSuccess: true, collections: data.collections }
    return { isSuccess: false, message: errorMessage(data) }
  } catch {
    // fetch rejects only on network failure.
    return { isSuccess: false, message: errorMessage(null) }
  }
}

async function sendForCollection(
  url: string,
  init: RequestInit,
  onUnauthenticated: () => void,
): Promise<CollectionResult> {
  try {
    const res = await fetch(url, init)
    if (res.status === UNAUTHORIZED_STATUS) onUnauthenticated()
    const data: unknown = await res.json().catch(() => null)
    if (res.ok && isCollection(data)) return { isSuccess: true, collection: data }
    return { isSuccess: false, message: errorMessage(data) }
  } catch {
    return { isSuccess: false, message: errorMessage(null) }
  }
}

export function postCollection(
  name: string,
  onUnauthenticated: () => void,
): Promise<CollectionResult> {
  const init = { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ name }) }
  return sendForCollection('/api/collections', init, onUnauthenticated)
}

export function patchCollection(
  id: string,
  name: string,
  onUnauthenticated: () => void,
): Promise<CollectionResult> {
  const init = { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify({ name }) }
  return sendForCollection(`/api/collections/${id}`, init, onUnauthenticated)
}

export async function deleteCollection(
  id: string,
  onUnauthenticated: () => void,
): Promise<CollectionDeletion> {
  try {
    const res = await fetch(`/api/collections/${id}`, { method: 'DELETE' })
    if (res.status === UNAUTHORIZED_STATUS) onUnauthenticated()
    if (res.ok) return { isSuccess: true }
    const data: unknown = await res.json().catch(() => null)
    return { isSuccess: false, message: errorMessage(data) }
  } catch {
    return { isSuccess: false, message: errorMessage(null) }
  }
}

export function putCollectionPhoto(
  id: string,
  photoId: string,
  onUnauthenticated: () => void,
): Promise<CollectionResult> {
  const url = `/api/collections/${id}/photos/${photoId}`
  return sendForCollection(url, { method: 'PUT' }, onUnauthenticated)
}

export function deleteCollectionPhoto(
  id: string,
  photoId: string,
  onUnauthenticated: () => void,
): Promise<CollectionResult> {
  const url = `/api/collections/${id}/photos/${photoId}`
  return sendForCollection(url, { method: 'DELETE' }, onUnauthenticated)
}
