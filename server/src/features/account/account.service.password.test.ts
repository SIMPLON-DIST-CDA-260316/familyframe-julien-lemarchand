import { describe, expect, it, vi } from 'vitest'
import type { Logger } from '../../lib/logger.js'
import type { AccountRepository, UserRecord } from './account.repository.js'
import { type AccountServiceDeps, createAccountService } from './account.service.js'

const USER_ID = '6b044f9d56a44767c7079b02'
const SESSION_ID = '6b044f9d56a44767c7079c01'
const CURRENT_PASSWORD = 'membre-familyframe-dev'
const NEW_PASSWORD = 'un-nouveau-mot-de-passe'
const USER: UserRecord = {
  id: USER_ID,
  email: 'membre@familyframe.test',
  displayName: 'Membre',
  passwordHash: '$argon2id$stored-hash',
  role: 'member',
  avatarCloudinaryId: null,
  createdAt: new Date('2026-11-01T10:00:00Z'),
}

// Every step succeeds by default: the account exists, the current password matches, two other
// devices are logged in. Each test breaks only the one it is about.
function makeDeps() {
  return {
    repository: {
      findUserById: vi.fn<AccountRepository['findUserById']>().mockResolvedValue(USER),
      updateDisplayName: vi.fn<AccountRepository['updateDisplayName']>(),
      updatePasswordHash: vi.fn<AccountRepository['updatePasswordHash']>().mockResolvedValue(),
      deleteOtherSessions: vi.fn<AccountRepository['deleteOtherSessions']>().mockResolvedValue(2),
      updateAvatar: vi.fn<AccountRepository['updateAvatar']>(),
    },
    hashPassword: vi.fn<AccountServiceDeps['hashPassword']>().mockResolvedValue('$argon2id$new'),
    verifyPassword: vi.fn<AccountServiceDeps['verifyPassword']>().mockResolvedValue(true),
    toAvatarJpeg: vi.fn<AccountServiceDeps['toAvatarJpeg']>(),
    uploadAvatar: vi.fn<AccountServiceDeps['uploadAvatar']>(),
    deleteImage: vi.fn<AccountServiceDeps['deleteImage']>(),
    avatarUrl: vi.fn<AccountServiceDeps['avatarUrl']>(),
    logger: {
      info: vi.fn<Logger['info']>(),
      warn: vi.fn<Logger['warn']>(),
      error: vi.fn<Logger['error']>(),
    },
  }
}

type Deps = ReturnType<typeof makeDeps>

function changePassword(
  deps: Deps,
  passwords: { currentPassword?: unknown; newPassword?: unknown } = {},
): Promise<void> {
  return createAccountService(deps).changePassword({
    userId: USER_ID,
    sessionId: SESSION_ID,
    currentPassword: CURRENT_PASSWORD,
    newPassword: NEW_PASSWORD,
    ...passwords,
  })
}

describe('changePassword', () => {
  it('checks the current password against the stored hash', async () => {
    const deps = makeDeps()

    await changePassword(deps)

    expect(deps.verifyPassword).toHaveBeenCalledWith(USER.passwordHash, CURRENT_PASSWORD)
  })

  it('stores the hash of the new password', async () => {
    const deps = makeDeps()

    await changePassword(deps)

    expect(deps.hashPassword).toHaveBeenCalledWith(NEW_PASSWORD)
    expect(deps.repository.updatePasswordHash).toHaveBeenCalledWith(USER_ID, '$argon2id$new')
  })

  it('closes every other session of the account and keeps the current one', async () => {
    const deps = makeDeps()

    await changePassword(deps)

    expect(deps.repository.deleteOtherSessions).toHaveBeenCalledWith(USER_ID, SESSION_ID)
  })

  it('logs the user id and the number of closed sessions, never a password', async () => {
    const deps = makeDeps()

    await changePassword(deps)

    expect(deps.logger.info).toHaveBeenCalledWith('account.password_changed', {
      userId: USER_ID,
      closedSessionCount: 2,
    })
    expect(JSON.stringify(deps.logger.info.mock.calls)).not.toContain('mot-de-passe')
  })

  it('refuses a wrong current password with PASSWORD_INCORRECT and changes nothing', async () => {
    const deps = makeDeps()
    deps.verifyPassword.mockResolvedValue(false)

    await expect(changePassword(deps)).rejects.toMatchObject({ code: 'PASSWORD_INCORRECT' })
    expect(deps.repository.updatePasswordHash).not.toHaveBeenCalled()
    expect(deps.repository.deleteOtherSessions).not.toHaveBeenCalled()
    expect(deps.logger.warn).toHaveBeenCalledWith('account.password_change_failed', {
      reason: 'incorrect_password',
      userId: USER_ID,
    })
  })

  it.each([
    ['missing', undefined],
    ['not a string', 42],
  ])('refuses a current password %s without calling argon2', async (_label, currentPassword) => {
    const deps = makeDeps()

    await expect(changePassword(deps, { currentPassword })).rejects.toMatchObject({
      code: 'PASSWORD_INCORRECT',
    })
    expect(deps.verifyPassword).not.toHaveBeenCalled()
  })

  it.each([
    ['11 characters', 'p'.repeat(11)],
    ['129 characters', 'p'.repeat(129)],
    ['missing', undefined],
  ])('refuses a new password of %s before reading the account', async (_label, newPassword) => {
    const deps = makeDeps()

    await expect(changePassword(deps, { newPassword })).rejects.toMatchObject({
      code: 'PASSWORD_INVALID',
    })
    expect(deps.repository.findUserById).not.toHaveBeenCalled()
    expect(deps.repository.updatePasswordHash).not.toHaveBeenCalled()
  })

  it('accepts a new password of 12 and of 128 characters', async () => {
    const deps = makeDeps()

    await changePassword(deps, { newPassword: 'p'.repeat(12) })
    await changePassword(deps, { newPassword: 'p'.repeat(128) })

    expect(deps.repository.updatePasswordHash).toHaveBeenCalledTimes(2)
  })

  it('refuses with UNAUTHENTICATED when the account no longer exists', async () => {
    const deps = makeDeps()
    deps.repository.findUserById.mockResolvedValue(null)

    await expect(changePassword(deps)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
    expect(deps.repository.updatePasswordHash).not.toHaveBeenCalled()
  })
})
