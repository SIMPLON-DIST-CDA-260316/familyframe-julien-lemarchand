import { parseDisplayName } from '../../lib/account-input.js'
import type { Logger } from '../../lib/logger.js'
import type { PublicUser } from '../../types.js'
import { type AvatarUrlBuilder, toPublicUser } from '../auth/public-user.js'
import type { AccountRepository } from './account.repository.js'

// userId is the logged-in account: one edits only oneself. displayName comes straight from the
// JSON body: validated here, at the boundary.
export type DisplayNameChange = { userId: string; displayName: unknown }

export type AccountServiceDeps = {
  repository: AccountRepository
  avatarUrl: AvatarUrlBuilder
  logger: Logger
}

export type AccountService = {
  changeDisplayName: (change: DisplayNameChange) => Promise<PublicUser>
}

// Received photos show the new name at once: « Envoyée par » reads it through a join.
async function changeDisplayName(
  { repository, avatarUrl, logger }: AccountServiceDeps,
  { userId, displayName }: DisplayNameChange,
): Promise<PublicUser> {
  const user = await repository.updateDisplayName(userId, parseDisplayName(displayName))
  // The id only: a display name is personal data.
  logger.info('account.renamed', { userId })
  return toPublicUser(user, avatarUrl)
}

export function createAccountService(deps: AccountServiceDeps): AccountService {
  return {
    changeDisplayName: (change) => changeDisplayName(deps, change),
  }
}
