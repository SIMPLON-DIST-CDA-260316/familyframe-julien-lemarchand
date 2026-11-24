import { AppError } from '../../errors/app-error.js'
import { parseDisplayName, parsePassword } from '../../lib/account-input.js'
import type { UploadedImage } from '../../lib/cloudinary.js'
import type { Logger } from '../../lib/logger.js'
import type { PublicUser } from '../../types.js'
import { type AvatarUrlBuilder, toPublicUser } from '../auth/public-user.js'
import { parseFile, type UploadedFile } from '../photos/photos.input.js'
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

// file is what multer left on req.file: undefined when the form had no file.
export type AvatarChange = { userId: string; file: UploadedFile | undefined }

export type AccountServiceDeps = {
  repository: AccountRepository
  hashPassword: (plain: string) => Promise<string>
  verifyPassword: (passwordHash: string, plain: string) => Promise<boolean>
  toAvatarJpeg: (input: Buffer) => Promise<Buffer>
  uploadAvatar: (jpeg: Buffer) => Promise<UploadedImage>
  deleteImage: (cloudinaryId: string) => Promise<void>
  avatarUrl: AvatarUrlBuilder
  logger: Logger
}

export type AccountService = {
  changeDisplayName: (change: DisplayNameChange) => Promise<PublicUser>
  changePassword: (change: PasswordChange) => Promise<void>
  changeAvatar: (change: AvatarChange) => Promise<PublicUser>
  removeAvatar: (userId: string) => Promise<PublicUser>
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

async function convertAvatar(
  { toAvatarJpeg, logger }: AccountServiceDeps,
  userId: string,
  input: Buffer,
): Promise<Buffer> {
  try {
    return await toAvatarJpeg(input)
  } catch (error: unknown) {
    logger.warn('account.avatar_unreadable', { userId, error })
    throw new AppError('IMAGE_UNREADABLE')
  }
}

// The image is already on Cloudinary: if the account cannot point to it, say so before failing.
async function saveAvatar(
  { repository, logger }: AccountServiceDeps,
  userId: string,
  cloudinaryId: string,
): Promise<UserRecord> {
  try {
    return await repository.updateAvatar(userId, cloudinaryId)
  } catch (error: unknown) {
    logger.error('account.avatar_orphaned', { userId, cloudinaryId, error })
    throw error
  }
}

// After the database write, and never fatal: the account already shows its new state, a leftover
// image only costs storage.
async function destroyAvatar(
  { deleteImage, logger }: AccountServiceDeps,
  userId: string,
  cloudinaryId: string,
): Promise<boolean> {
  try {
    await deleteImage(cloudinaryId)
    return true
  } catch (error: unknown) {
    logger.error('account.avatar_orphaned', { userId, cloudinaryId, error })
    return false
  }
}

async function changeAvatar(deps: AccountServiceDeps, change: AvatarChange): Promise<PublicUser> {
  const jpeg = await convertAvatar(deps, change.userId, parseFile(change.file).buffer)
  const { id: userId, avatarCloudinaryId: previousCloudinaryId } = await findUser(
    deps,
    change.userId,
  )
  const { cloudinaryId } = await deps.uploadAvatar(jpeg)
  const user = await saveAvatar(deps, userId, cloudinaryId)
  const isPreviousDestroyed =
    previousCloudinaryId !== null && (await destroyAvatar(deps, userId, previousCloudinaryId))
  deps.logger.info('account.avatar_changed', {
    userId,
    cloudinaryId,
    previousCloudinaryId,
    isPreviousDestroyed,
  })
  return toPublicUser(user, deps.avatarUrl)
}

// Idempotent, like logout: removing a photo that is already gone answers the same account.
async function removeAvatar(deps: AccountServiceDeps, userId: string): Promise<PublicUser> {
  const current = await findUser(deps, userId)
  const cloudinaryId = current.avatarCloudinaryId
  if (cloudinaryId === null) {
    return toPublicUser(current, deps.avatarUrl)
  }
  const user = await deps.repository.updateAvatar(userId, null)
  const isImageDestroyed = await destroyAvatar(deps, userId, cloudinaryId)
  deps.logger.info('account.avatar_removed', { userId, cloudinaryId, isImageDestroyed })
  return toPublicUser(user, deps.avatarUrl)
}

export function createAccountService(deps: AccountServiceDeps): AccountService {
  return {
    changeDisplayName: (change) => changeDisplayName(deps, change),
    changePassword: (change) => changePassword(deps, change),
    changeAvatar: (change) => changeAvatar(deps, change),
    removeAvatar: (userId) => removeAvatar(deps, userId),
  }
}
