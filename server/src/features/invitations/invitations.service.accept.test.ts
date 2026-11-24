import { describe, expect, it, vi } from 'vitest'
import type { Logger } from '../../lib/logger.js'
import type {
  InvitationRecord,
  InvitationsRepository,
  UserRecord,
} from './invitations.repository.js'
import {
  createInvitationsService,
  type InvitationAcceptance,
  type InvitationsServiceDeps,
} from './invitations.service.js'

const NOW = new Date('2026-11-24T10:00:00Z')
const TOKEN = 'a'.repeat(64)
const TOKEN_HASH = 'b'.repeat(64)
const INVITATION_ID = '6b044f9d56a44767c7079d01'
const EMAIL = 'mamie@example.fr'
const PASSWORD = 'mot-de-passe-de-mamie'
const PASSWORD_HASH = '$argon2id$new-hash'
const NEW_USER: UserRecord = {
  id: '6b044f9d56a44767c7079b09',
  email: EMAIL,
  displayName: 'Mamie',
  passwordHash: PASSWORD_HASH,
  role: 'member',
  createdAt: NOW,
}
const ACCEPTANCE: InvitationAcceptance = { token: TOKEN, displayName: 'Mamie', password: PASSWORD }

function invitationRecord(overrides: Partial<InvitationRecord> = {}): InvitationRecord {
  return {
    id: INVITATION_ID,
    tokenHash: TOKEN_HASH,
    email: EMAIL,
    invitedById: '6b044f9d56a44767c7079b01',
    expiresAt: new Date('2026-11-30T10:00:00Z'),
    usedAt: null,
    createdAt: new Date('2026-11-23T10:00:00Z'),
    ...overrides,
  }
}

// Accepting reads only the last three repository functions: the others stay unused.
// By default a pending invitation and a free address; each test breaks one thing.
function makeDeps() {
  return {
    repository: {
      hasUserWithEmail: vi.fn<InvitationsRepository['hasUserWithEmail']>(),
      deleteUnusedByEmail: vi.fn<InvitationsRepository['deleteUnusedByEmail']>(),
      create: vi.fn<InvitationsRepository['create']>(),
      findAll: vi.fn<InvitationsRepository['findAll']>(),
      findByTokenHash: vi
        .fn<InvitationsRepository['findByTokenHash']>()
        .mockResolvedValue(invitationRecord()),
      createUser: vi.fn<InvitationsRepository['createUser']>().mockResolvedValue(NEW_USER),
      markUsed: vi.fn<InvitationsRepository['markUsed']>().mockResolvedValue(undefined),
    },
    generateToken: vi.fn<InvitationsServiceDeps['generateToken']>(),
    hashToken: vi.fn<InvitationsServiceDeps['hashToken']>().mockReturnValue(TOKEN_HASH),
    hashPassword: vi.fn<InvitationsServiceDeps['hashPassword']>().mockResolvedValue(PASSWORD_HASH),
    now: vi.fn<InvitationsServiceDeps['now']>().mockReturnValue(NOW),
    logger: {
      info: vi.fn<Logger['info']>(),
      warn: vi.fn<Logger['warn']>(),
      error: vi.fn<Logger['error']>(),
    },
  }
}

type Deps = ReturnType<typeof makeDeps>

function accept(deps: Deps, overrides: Partial<InvitationAcceptance> = {}): Promise<unknown> {
  return createInvitationsService(deps).acceptInvitation({ ...ACCEPTANCE, ...overrides })
}

describe('acceptInvitation: the link', () => {
  it.each([
    ['a token that is not a string', 42],
    ['a 63-character token', 'a'.repeat(63)],
  ])('rejects %s without a lookup', async (_label, token) => {
    const deps = makeDeps()

    await expect(accept(deps, { token })).rejects.toMatchObject({ code: 'INVITATION_NOT_FOUND' })
    expect(deps.repository.findByTokenHash).not.toHaveBeenCalled()
  })

  it('rejects a token that matches no invitation', async () => {
    const deps = makeDeps()
    deps.repository.findByTokenHash.mockResolvedValue(null)

    await expect(accept(deps)).rejects.toMatchObject({ code: 'INVITATION_NOT_FOUND' })
    expect(deps.repository.findByTokenHash).toHaveBeenCalledWith(TOKEN_HASH)
  })

  it('rejects a used invitation', async () => {
    const deps = makeDeps()
    deps.repository.findByTokenHash.mockResolvedValue(invitationRecord({ usedAt: NOW }))

    await expect(accept(deps)).rejects.toMatchObject({ code: 'INVITATION_USED' })
  })

  it('rejects an invitation whose end is reached', async () => {
    const deps = makeDeps()
    deps.repository.findByTokenHash.mockResolvedValue(invitationRecord({ expiresAt: NOW }))

    await expect(accept(deps)).rejects.toMatchObject({ code: 'INVITATION_EXPIRED' })
  })

  it('reports a dead link before an invalid name or password', async () => {
    const deps = makeDeps()
    deps.repository.findByTokenHash.mockResolvedValue(invitationRecord({ usedAt: NOW }))

    await expect(accept(deps, { displayName: '', password: 'court' })).rejects.toMatchObject({
      code: 'INVITATION_USED',
    })
  })
})

describe('acceptInvitation: the display name and the password', () => {
  it.each([
    ['blanks only', '  '],
    ['51 characters', 'n'.repeat(51)],
    ['a number', 42],
  ])('rejects a display name made of %s', async (_label, displayName) => {
    const deps = makeDeps()

    await expect(accept(deps, { displayName })).rejects.toMatchObject({
      code: 'DISPLAY_NAME_INVALID',
    })
    expect(deps.repository.createUser).not.toHaveBeenCalled()
  })

  it('stores the display name trimmed', async () => {
    const deps = makeDeps()

    await accept(deps, { displayName: '  Mamie  ' })

    expect(deps.repository.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: 'Mamie' }),
    )
  })

  it('accepts a 50-character display name', async () => {
    const deps = makeDeps()

    await accept(deps, { displayName: 'n'.repeat(50) })

    expect(deps.repository.createUser).toHaveBeenCalled()
  })

  it.each([
    ['11 characters', 'p'.repeat(11)],
    ['129 characters', 'p'.repeat(129)],
    ['a number', 42],
  ])('rejects a password of %s', async (_label, password) => {
    const deps = makeDeps()

    await expect(accept(deps, { password })).rejects.toMatchObject({ code: 'PASSWORD_INVALID' })
    expect(deps.hashPassword).not.toHaveBeenCalled()
  })

  it.each([12, 128])('accepts a password of %i characters', async (length) => {
    const deps = makeDeps()

    await accept(deps, { password: 'p'.repeat(length) })

    expect(deps.hashPassword).toHaveBeenCalledWith('p'.repeat(length))
  })

  it('hashes the password as typed, spaces included', async () => {
    const deps = makeDeps()

    await accept(deps, { password: '  mot de passe  ' })

    expect(deps.hashPassword).toHaveBeenCalledWith('  mot de passe  ')
  })
})

describe('acceptInvitation: the account', () => {
  it('creates a member with the invitation email, marks it used and returns the public user', async () => {
    const deps = makeDeps()

    const user = await accept(deps)

    expect(deps.hashPassword).toHaveBeenCalledWith(PASSWORD)
    expect(deps.repository.createUser).toHaveBeenCalledWith({
      email: EMAIL,
      displayName: 'Mamie',
      passwordHash: PASSWORD_HASH,
    })
    expect(deps.repository.markUsed).toHaveBeenCalledWith(INVITATION_ID, NOW)
    expect(user).toEqual({ id: NEW_USER.id, email: EMAIL, displayName: 'Mamie', role: 'member' })
  })

  it('rejects an address that got an account meanwhile, leaving the invitation unused', async () => {
    const deps = makeDeps()
    deps.repository.createUser.mockResolvedValue(null)

    await expect(accept(deps)).rejects.toMatchObject({ code: 'ACCOUNT_EXISTS' })
    expect(deps.repository.markUsed).not.toHaveBeenCalled()
  })
})

describe('acceptInvitation: the logs', () => {
  // Every value the person typed or received: none may reach the logs.
  function expectNoPersonalData(deps: Deps): void {
    const logged = JSON.stringify([
      deps.logger.info.mock.calls,
      deps.logger.warn.mock.calls,
      deps.logger.error.mock.calls,
    ])
    for (const secret of [TOKEN, TOKEN_HASH, EMAIL, 'Mamie', PASSWORD]) {
      expect(logged).not.toContain(secret)
    }
  }

  it('logs the accepted invitation by ids only', async () => {
    const deps = makeDeps()

    await accept(deps)

    expect(deps.logger.info).toHaveBeenCalledWith('invitation.accepted', {
      invitationId: INVITATION_ID,
      userId: NEW_USER.id,
    })
    expectNoPersonalData(deps)
  })

  it.each([
    ['not_found', { findByTokenHash: null }, {}],
    [
      'used',
      { findByTokenHash: invitationRecord({ usedAt: NOW }) },
      { invitationId: INVITATION_ID },
    ],
    [
      'expired',
      { findByTokenHash: invitationRecord({ expiresAt: NOW }) },
      { invitationId: INVITATION_ID },
    ],
    ['account_exists', { createUser: null }, { invitationId: INVITATION_ID }],
  ])('logs a refusal for %s with its reason only', async (reason, failure, ids) => {
    const deps = makeDeps()
    if ('findByTokenHash' in failure) {
      deps.repository.findByTokenHash.mockResolvedValue(failure.findByTokenHash)
    }
    if ('createUser' in failure) {
      deps.repository.createUser.mockResolvedValue(failure.createUser)
    }

    await expect(accept(deps)).rejects.toThrow()
    expect(deps.logger.warn).toHaveBeenCalledWith('invitation.accept_failed', { reason, ...ids })
    expectNoPersonalData(deps)
  })
})
