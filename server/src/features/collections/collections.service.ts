import { AppError } from '../../errors/app-error.js'
import type { Logger } from '../../lib/logger.js'
import type { ApiErrorCode, Collection } from '../../types.js'
import { OBJECT_ID_PATTERN, parsePhotoId } from '../photos/photos.input.js'
import type {
  CollectionRecord,
  CollectionsRepository,
  WriteRefusal,
} from './collections.repository.js'

// A menu entry, like a display name: a bound keeps the menus and the frame settings readable.
export const MAX_COLLECTION_NAME_LENGTH = 50

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

export type CollectionsServiceDeps = {
  repository: CollectionsRepository
  logger: Logger
}

export type CollectionsService = {
  listCollections: (ownerId: string) => Promise<Collection[]>
  createCollection: (collection: NewCollection) => Promise<Collection>
  renameCollection: (rename: CollectionRename) => Promise<Collection>
  deleteCollection: (action: CollectionAction) => Promise<void>
  addPhoto: (membership: PhotoMembership) => Promise<Collection>
  removePhoto: (membership: PhotoMembership) => Promise<Collection>
}

// Trimmed, like a display name: « Noël » and « Noël  » are the same name.
export function parseCollectionName(name: unknown): string {
  if (typeof name !== 'string') {
    throw new AppError('COLLECTION_NAME_INVALID')
  }
  const trimmedName = name.trim()
  if (trimmedName.length === 0 || trimmedName.length > MAX_COLLECTION_NAME_LENGTH) {
    throw new AppError('COLLECTION_NAME_INVALID')
  }
  return trimmedName
}

// Prisma fails on an id that is not an ObjectId: that would be a 500, not a 404.
function parseCollectionId(id: string): string {
  if (!OBJECT_ID_PATTERN.test(id)) {
    throw new AppError('COLLECTION_NOT_FOUND')
  }
  return id
}

function orThrow(result: CollectionRecord | WriteRefusal): CollectionRecord {
  if (typeof result === 'string') {
    throw new AppError(ERROR_BY_REFUSAL[result])
  }
  return result
}

// A deleted photo's id stays in photoIds: the DTO keeps the photos still in the library.
function toCollectionDto(
  { id, name, photoIds }: CollectionRecord,
  liveIds: Set<string>,
): Collection {
  return { id, name, photoIds: photoIds.filter((photoId) => liveIds.has(photoId)) }
}

// One query for every collection, however many there are.
async function findLiveIds(
  { repository }: CollectionsServiceDeps,
  ownerId: string,
  records: CollectionRecord[],
): Promise<Set<string>> {
  const allIds = records.flatMap((record) => record.photoIds)
  return new Set(await repository.findLivePhotoIds(ownerId, allIds))
}

async function toCollection(
  deps: CollectionsServiceDeps,
  record: CollectionRecord,
): Promise<Collection> {
  return toCollectionDto(record, await findLiveIds(deps, record.ownerId, [record]))
}

// « Été » before « Noël »: French order, not the order of the character codes.
async function listCollections(
  deps: CollectionsServiceDeps,
  ownerId: string,
): Promise<Collection[]> {
  const records = await deps.repository.findAllOf(ownerId)
  const liveIds = await findLiveIds(deps, ownerId, records)
  const collections = records.map((record) => toCollectionDto(record, liveIds))
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

// MongoDB answers ObjectIds in lowercase: an id sent in capitals must compare equal to it.
function parseMemberPhotoId(photoId: string): string {
  return parsePhotoId(photoId).toLowerCase()
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
    removePhoto: (membership) => removePhoto(deps, membership),
  }
}
