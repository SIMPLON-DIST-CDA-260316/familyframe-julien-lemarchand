import { AppError } from '../../errors/app-error.js'
import { parseDisplayName, parsePassword } from '../../lib/account-input.js'
import type { Logger } from '../../lib/logger.js'
import type { PublicUser } from '../../types.js'
import { type AvatarUrlBuilder, toPublicUser } from '../auth/public-user.js'
import type { AccountRepository, UserRecord } from './account.repository.js'

// userId is the logged-in account: one edits only oneself. displayName comes straight from the
// JSON body: validated here, at the boundary.
export type DisplayNameChange = { userId: string; displayName: unknown }

// sessionId is the session making the request: the only one left open afterwards.
export type PasswordChange = {
  userId: string
  sessionId: string
  currentPassword: unknown
  newPassword: unknown
}

export type AccountServiceDeps = {
  repository: AccountRepository
  hashPassword: (plain: string) => Promise<string>
  verifyPassword: (passwordHash: string, plain: string) => Promise<boolean>
  avatarUrl: AvatarUrlBuilder
  logger: Logger
}

export type AccountService = {
  changeDisplayName: (change: DisplayNameChange) => Promise<PublicUser>
  changePassword: (change: PasswordChange) => Promise<void>
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

// requireAuth loaded this account a moment ago: missing now means it was deleted meanwhile.
async function findUser({ repository }: AccountServiceDeps, userId: string): Promise<UserRecord> {
  const user = await repository.findUserById(userId)
  if (!user) {
    throw new AppError('UNAUTHENTICATED')
  }
  return user
}

// A stolen session alone cannot lock the owner out: changing the password asks for the current one.
async function checkCurrentPassword(
  { verifyPassword, logger }: AccountServiceDeps,
  user: UserRecord,
  currentPassword: unknown,
): Promise<void> {
  const isValid =
    typeof currentPassword === 'string' &&
    (await verifyPassword(user.passwordHash, currentPassword))
  if (!isValid) {
    logger.warn('account.password_change_failed', {
      reason: 'incorrect_password',
      userId: user.id,
    })
    throw new AppError('PASSWORD_INCORRECT')
  }
}

// The other sessions close: a device that knew the old password, or a stolen cookie, is out.
// The frame logs in again with the new one.
async function changePassword(deps: AccountServiceDeps, change: PasswordChange): Promise<void> {
  const { repository, hashPassword, logger } = deps
  const newPassword = parsePassword(change.newPassword)
  const user = await findUser(deps, change.userId)
  await checkCurrentPassword(deps, user, change.currentPassword)
  await repository.updatePasswordHash(user.id, await hashPassword(newPassword))
  const closedSessionCount = await repository.deleteOtherSessions(user.id, change.sessionId)
  logger.info('account.password_changed', { userId: user.id, closedSessionCount })
}

export function createAccountService(deps: AccountServiceDeps): AccountService {
  return {
    changeDisplayName: (change) => changeDisplayName(deps, change),
    changePassword: (change) => changePassword(deps, change),
  }
}
