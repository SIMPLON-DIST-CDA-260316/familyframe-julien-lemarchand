import { describe, expect, it, vi } from 'vitest'
import type { Logger } from '../../lib/logger.js'
import type { AccountRepository, UserRecord } from './account.repository.js'
import { type AccountServiceDeps, createAccountService } from './account.service.js'

const USER_ID = '6b044f9d56a44767c7079b02'
const USER: UserRecord = {
  id: USER_ID,
  email: 'membre@familyframe.test',
  displayName: 'Membre',
  passwordHash: '$argon2id$stored-hash',
  role: 'member',
  avatarCloudinaryId: null,
  createdAt: new Date('2026-11-01T10:00:00Z'),
}

// The update returns the account with the name it was given; each test breaks one thing.
function makeDeps() {
  return {
    repository: {
      findUserById: vi.fn<AccountRepository['findUserById']>(),
      updateDisplayName: vi
        .fn<AccountRepository['updateDisplayName']>()
        .mockImplementation(async (_id, displayName) => ({ ...USER, displayName })),
      updatePasswordHash: vi.fn<AccountRepository['updatePasswordHash']>(),
      deleteOtherSessions: vi.fn<AccountRepository['deleteOtherSessions']>(),
    },
    hashPassword: vi.fn<AccountServiceDeps['hashPassword']>(),
    verifyPassword: vi.fn<AccountServiceDeps['verifyPassword']>(),
    avatarUrl: vi.fn<AccountServiceDeps['avatarUrl']>(
      (cloudinaryId) => `https://cdn.test/${cloudinaryId}`,
    ),
    logger: {
      info: vi.fn<Logger['info']>(),
      warn: vi.fn<Logger['warn']>(),
      error: vi.fn<Logger['error']>(),
    },
  }
}

type Deps = ReturnType<typeof makeDeps>

function changeDisplayName(deps: Deps, displayName: unknown): Promise<unknown> {
  return createAccountService(deps).changeDisplayName({ userId: USER_ID, displayName })
}

describe('changeDisplayName', () => {
  it('stores the name trimmed and returns the public user', async () => {
    const deps = makeDeps()

    const user = await changeDisplayName(deps, '  Mamie Jo  ')

    expect(deps.repository.updateDisplayName).toHaveBeenCalledWith(USER_ID, 'Mamie Jo')
    expect(user).toEqual({
      id: USER_ID,
      email: USER.email,
      displayName: 'Mamie Jo',
      role: 'member',
      avatarUrl: null,
    })
  })

  it.each([
    ['blanks only', '  '],
    ['51 characters', 'n'.repeat(51)],
    ['a number', 42],
    ['nothing', undefined],
  ])('rejects a name made of %s without writing', async (_label, displayName) => {
    const deps = makeDeps()

    await expect(changeDisplayName(deps, displayName)).rejects.toMatchObject({
      code: 'DISPLAY_NAME_INVALID',
    })
    expect(deps.repository.updateDisplayName).not.toHaveBeenCalled()
    expect(deps.logger.info).not.toHaveBeenCalled()
  })

  it('accepts a 50-character name', async () => {
    const deps = makeDeps()

    await changeDisplayName(deps, 'n'.repeat(50))

    expect(deps.repository.updateDisplayName).toHaveBeenCalledWith(USER_ID, 'n'.repeat(50))
  })

  it('keeps the avatar URL of an account with a profile photo', async () => {
    const deps = makeDeps()
    deps.repository.updateDisplayName.mockResolvedValue({
      ...USER,
      avatarCloudinaryId: 'familyframe/avatars/abc',
    })

    await expect(changeDisplayName(deps, 'Membre')).resolves.toMatchObject({
      avatarUrl: 'https://cdn.test/familyframe/avatars/abc',
    })
  })

  it('logs the user id, never the name', async () => {
    const deps = makeDeps()

    await changeDisplayName(deps, 'Mamie Jo')

    expect(deps.logger.info).toHaveBeenCalledWith('account.renamed', { userId: USER_ID })
    expect(JSON.stringify(deps.logger.info.mock.calls)).not.toContain('Mamie')
  })
})
