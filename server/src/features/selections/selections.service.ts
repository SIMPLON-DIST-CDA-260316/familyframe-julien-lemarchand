import { AppError } from '../../errors/app-error.js'
import type { Selection } from '../../types.js'
import { parsePhotoId } from '../photos/photos.input.js'
import { dayOf, drawDailySelection } from './selections.daily.js'
import { buildRadio } from './selections.radio.js'
import type { SelectionsRepository } from './selections.repository.js'

export type SelectionsServiceDeps = {
  repository: SelectionsRepository
  // Injected: a test picks the day, which seeds both draws.
  now: () => Date
}

// photoId comes from the URL; ownerId is the logged-in account.
export type RadioRequest = { ownerId: string; photoId: string }

export type SelectionsService = {
  dailySelection: (ownerId: string) => Promise<Selection>
  radioSelection: (request: RadioRequest) => Promise<Selection>
}

async function dailySelection(
  { repository, now }: SelectionsServiceDeps,
  ownerId: string,
): Promise<Selection> {
  const photos = await repository.findOpenedPhotos(ownerId)
  return { photoIds: drawDailySelection(photos, ownerId, now()) }
}

// Unknown, someone else's and still unopened photos all answer « not found », like opening one.
async function radioSelection(
  { repository, now }: SelectionsServiceDeps,
  { ownerId, photoId }: RadioRequest,
): Promise<Selection> {
  // MongoDB answers ObjectIds in lowercase: an id sent in capitals must compare equal to it.
  const startId = parsePhotoId(photoId).toLowerCase()
  const photos = await repository.findOpenedPhotos(ownerId)
  const start = photos.find(({ id }) => id === startId)
  if (!start) {
    throw new AppError('PHOTO_NOT_FOUND')
  }
  const collections = await repository.findCollectionPhotoIds(ownerId)
  return { photoIds: buildRadio({ photos, start, collections, day: dayOf(now()) }) }
}

export function createSelectionsService(deps: SelectionsServiceDeps): SelectionsService {
  return {
    dailySelection: (ownerId) => dailySelection(deps, ownerId),
    radioSelection: (request) => radioSelection(deps, request),
  }
}
