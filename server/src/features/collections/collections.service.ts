import { AppError } from '../../errors/app-error.js'
import type { Logger } from '../../lib/logger.js'
import type { ApiErrorCode, Collection } from '../../types.js'
import {
  parseCollectionId,
  parseCollectionName,
  parseMemberPhotoId,
  parsePhotoIds,
} from './collections.input.js'
import type {
  CollectionRecord,
  CollectionsRepository,
  LivePhoto,
  WriteRefusal,
} from './collections.repository.js'

const ERROR_BY_REFUSAL: Record<WriteRefusal, ApiErrorCode> = {
  not_found: 'COLLECTION_NOT_FOUND',
  name_taken: 'COLLECTION_EXISTS',
}

// name comes straight from the JSON body: validated here, at the boundary.
export type NewCollection = { ownerId: string; name: unknown }

// id comes from the URL; ownerId is the logged-in account.
export type CollectionAction = { id: string; ownerId: string }

export type CollectionRename = CollectionAction & { name: unknown }

// photoId comes from the URL too.
export type PhotoMembership = CollectionAction & { photoId: string }

// photoIds comes from the JSON body: validated by the service.
export type PhotosMembership = CollectionAction & { photoIds: unknown }

export type CollectionsServiceDeps = {
  repository: CollectionsRepository
  logger: Logger
  // The signed square thumbnail of the library (lib/cloudinary.ts): stubbed in the tests.
  thumbnailUrl: (cloudinaryId: string) => string
}

// The photos still in the library, by id: a deleted photo's id stays in photoIds.
type LivePhotos = Map<string, LivePhoto>

export type CollectionsService = {
  listCollections: (ownerId: string) => Promise<Collection[]>
  createCollection: (collection: NewCollection) => Promise<Collection>
  renameCollection: (rename: CollectionRename) => Promise<Collection>
  deleteCollection: (action: CollectionAction) => Promise<void>
  addPhoto: (membership: PhotoMembership) => Promise<Collection>
  addPhotos: (membership: PhotosMembership) => Promise<Collection>
  removePhoto: (membership: PhotoMembership) => Promise<Collection>
}

function orThrow(result: CollectionRecord | WriteRefusal): CollectionRecord {
  if (typeof result === 'string') {
    throw new AppError(ERROR_BY_REFUSAL[result])
  }
  return result
}

type PhotoSpan = Pick<Collection, 'coverUrl' | 'oldestPhotoAt' | 'newestPhotoAt'>

// The newest photo is the cover, as it comes first in the library (R-BIB-20), whatever the order
// the photos were added in. The dates run from the oldest photo to the newest.
export function photoSpan(
  photos: LivePhoto[],
  thumbnailUrl: (cloudinaryId: string) => string,
): PhotoSpan {
  const newestFirst = photos.toSorted((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  const newest = newestFirst.at(0)
  const oldest = newestFirst.at(-1)
  return {
    coverUrl: newest ? thumbnailUrl(newest.cloudinaryId) : null,
    oldestPhotoAt: oldest?.createdAt.toISOString() ?? null,
    newestPhotoAt: newest?.createdAt.toISOString() ?? null,
  }
}

// The DTO keeps the photos still in the library, in the order they were added.
function toCollectionDto(
  { thumbnailUrl }: CollectionsServiceDeps,
  { id, name, photoIds }: CollectionRecord,
  live: LivePhotos,
): Collection {
  const photos = photoIds.flatMap((photoId) => live.get(photoId) ?? [])
  return { id, name, photoIds: photos.map((photo) => photo.id), ...photoSpan(photos, thumbnailUrl) }
}

// One query for every collection, however many there are, and none when they hold no photo,
// such as a collection just created.
async function findLivePhotos(
  { repository }: CollectionsServiceDeps,
  ownerId: string,
  records: CollectionRecord[],
): Promise<LivePhotos> {
  const allIds = records.flatMap((record) => record.photoIds)
  if (allIds.length === 0) return new Map()
  const photos = await repository.findLivePhotos(ownerId, allIds)
  return new Map(photos.map((photo) => [photo.id, photo]))
}

async function toCollection(
  deps: CollectionsServiceDeps,
  record: CollectionRecord,
): Promise<Collection> {
  return toCollectionDto(deps, record, await findLivePhotos(deps, record.ownerId, [record]))
}

// « Été » before « Noël »: French order, not the order of the character codes.
async function listCollections(
  deps: CollectionsServiceDeps,
  ownerId: string,
): Promise<Collection[]> {
  const records = await deps.repository.findAllOf(ownerId)
  const live = await findLivePhotos(deps, ownerId, records)
  const collections = records.map((record) => toCollectionDto(deps, record, live))
  return collections.sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}

// Ids only in the logs: a collection's name is the owner's words.
async function createCollection(
  deps: CollectionsServiceDeps,
  { ownerId, name }: NewCollection,
): Promise<Collection> {
  const record = orThrow(await deps.repository.create(ownerId, parseCollectionName(name)))
  deps.logger.info('collection.created', { collectionId: record.id, userId: ownerId })
  return toCollection(deps, record)
}

async function renameCollection(
  deps: CollectionsServiceDeps,
  { id, ownerId, name }: CollectionRename,
): Promise<Collection> {
  const collectionId = parseCollectionId(id)
  const newName = parseCollectionName(name)
  const record = orThrow(await deps.repository.rename(collectionId, ownerId, newName))
  deps.logger.info('collection.renamed', { collectionId, userId: ownerId })
  return toCollection(deps, record)
}

// The photos stay in the library: only the list of ids goes.
async function deleteCollection(
  { repository, logger }: CollectionsServiceDeps,
  { id, ownerId }: CollectionAction,
): Promise<void> {
  const deleted = await repository.deleteOwned(parseCollectionId(id), ownerId)
  if (!deleted) {
    throw new AppError('COLLECTION_NOT_FOUND')
  }
  logger.info('collection.deleted', { collectionId: deleted.id, userId: ownerId })
}

async function findOwnedOrThrow(
  { repository }: CollectionsServiceDeps,
  id: string,
  ownerId: string,
): Promise<CollectionRecord> {
  const record = await repository.findOwned(id, ownerId)
  if (!record) {
    throw new AppError('COLLECTION_NOT_FOUND')
  }
  return record
}

// Unknown, someone else's and still unopened photos all answer « not found ». Adding a photo
// already in changes nothing: the write found no match, the collection is read as it is.
async function addPhoto(
  deps: CollectionsServiceDeps,
  { id, ownerId, ...membership }: PhotoMembership,
): Promise<Collection> {
  const collectionId = parseCollectionId(id)
  const photoId = parseMemberPhotoId(membership.photoId)
  if (!(await deps.repository.hasOpenedPhoto(ownerId, photoId))) {
    throw new AppError('PHOTO_NOT_FOUND')
  }
  const added = await deps.repository.addPhoto(collectionId, ownerId, photoId)
  if (added) {
    deps.logger.info('collection.photo_added', { collectionId, photoId, userId: ownerId })
  }
  return toCollection(deps, added ?? (await findOwnedOrThrow(deps, collectionId, ownerId)))
}

// The ids not in yet, in the order chosen, appended only if the list is still the one read: null
// when it changed in between, nothing was written.
async function appendOnce(
  deps: CollectionsServiceDeps,
  collectionId: string,
  { ownerId, photoIds }: { ownerId: string; photoIds: string[] },
): Promise<CollectionRecord | null> {
  const record = await findOwnedOrThrow(deps, collectionId, ownerId)
  const missing = photoIds.filter((photoId) => !record.photoIds.includes(photoId))
  if (missing.length === 0) return record
  const appended = [...record.photoIds, ...missing]
  const updated = await deps.repository.setPhotoIds(
    collectionId,
    ownerId,
    record.photoIds,
    appended,
  )
  if (updated) {
    deps.logger.info('collection.photos_added', {
      collectionId,
      count: missing.length,
      userId: ownerId,
    })
  }
  return updated
}

// All or nothing, as the single add: one unknown, someone else's or unopened photo refuses the
// whole list before any write. Photos already in stay where they are. One retry, as a removal.
async function addPhotos(
  deps: CollectionsServiceDeps,
  { id, ownerId, ...input }: PhotosMembership,
): Promise<Collection> {
  const collectionId = parseCollectionId(id)
  const photoIds = parsePhotoIds(input.photoIds)
  if ((await deps.repository.countOpenedPhotos(ownerId, photoIds)) !== photoIds.length) {
    throw new AppError('PHOTO_NOT_FOUND')
  }
  const addition = { ownerId, photoIds }
  const record =
    (await appendOnce(deps, collectionId, addition)) ??
    (await appendOnce(deps, collectionId, addition))
  if (!record) {
    throw new Error('Collection kept changing while photos were added')
  }
  return toCollection(deps, record)
}

type Removal = { record: CollectionRecord; isRemoved: boolean }

// Prisma has no $pull: the list is written back without the photo, only if it is still the
// list read. null: it changed in between, nothing was written.
async function removeOnce(
  deps: CollectionsServiceDeps,
  collectionId: string,
  { ownerId, photoId }: Omit<PhotoMembership, 'id'>,
): Promise<Removal | null> {
  const record = await findOwnedOrThrow(deps, collectionId, ownerId)
  if (!record.photoIds.includes(photoId)) {
    return { record, isRemoved: false }
  }
  const kept = record.photoIds.filter((inCollection) => inCollection !== photoId)
  const updated = await deps.repository.setPhotoIds(collectionId, ownerId, record.photoIds, kept)
  return updated ? { record: updated, isRemoved: true } : null
}

// A photo that is not in the collection, or no longer exists, changes nothing. One retry: the
// second read sees the other device's write, or the collection gone (404).
async function removePhoto(
  deps: CollectionsServiceDeps,
  { id, ownerId, ...input }: PhotoMembership,
): Promise<Collection> {
  const collectionId = parseCollectionId(id)
  const photoId = parseMemberPhotoId(input.photoId)
  const membership = { ownerId, photoId }
  const removal =
    (await removeOnce(deps, collectionId, membership)) ??
    (await removeOnce(deps, collectionId, membership))
  if (!removal) {
    // Changed again between the second read and write: a 500, never a silent loss.
    throw new Error('Collection kept changing while a photo was removed')
  }
  if (removal.isRemoved) {
    deps.logger.info('collection.photo_removed', { collectionId, photoId, userId: ownerId })
  }
  return toCollection(deps, removal.record)
}

export function createCollectionsService(deps: CollectionsServiceDeps): CollectionsService {
  return {
    listCollections: (ownerId) => listCollections(deps, ownerId),
    createCollection: (collection) => createCollection(deps, collection),
    renameCollection: (rename) => renameCollection(deps, rename),
    deleteCollection: (action) => deleteCollection(deps, action),
    addPhoto: (membership) => addPhoto(deps, membership),
    addPhotos: (membership) => addPhotos(deps, membership),
    removePhoto: (membership) => removePhoto(deps, membership),
  }
}
