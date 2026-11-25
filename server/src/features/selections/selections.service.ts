import type { Selection } from '../../types.js'
import { drawDailySelection } from './selections.daily.js'
import type { SelectionsRepository } from './selections.repository.js'

export type SelectionsServiceDeps = {
  repository: SelectionsRepository
  // Injected: a test picks the day.
  now: () => Date
}

export type SelectionsService = {
  dailySelection: (ownerId: string) => Promise<Selection>
}

async function dailySelection(
  { repository, now }: SelectionsServiceDeps,
  ownerId: string,
): Promise<Selection> {
  const photos = await repository.findOpenedPhotos(ownerId)
  return { photoIds: drawDailySelection(photos, ownerId, now()) }
}

export function createSelectionsService(deps: SelectionsServiceDeps): SelectionsService {
  return {
    dailySelection: (ownerId) => dailySelection(deps, ownerId),
  }
}
