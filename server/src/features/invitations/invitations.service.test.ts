import { describe, expect, it, vi } from 'vitest'
import type { Logger } from '../../lib/logger.js'
import type { InvitationRecord, InvitationsRepository } from './invitations.repository.js'
import {
  createInvitationsService,
  INVITATION_DURATION_MS,
  type InvitationsServiceDeps,
} from './invitations.service.js'

const NOW = new Date('2026-11-24T10:00:00Z')
const EXPIRES_AT = new Date(NOW.getTime() + INVITATION_DURATION_MS)
const ADMIN_ID = '6b044f9d56a44767c7079b01'
const EMAIL = 'mamie@example.fr'
const TOKEN = 'a'.repeat(64)
const TOKEN_HASH = 'b'.repeat(64)

function invitationRecord(overrides: Partial<InvitationRecord> = {}): InvitationRecord {
  return {
    id: '6b044f9d56a44767c7079d01',
    tokenHash: TOKEN_HASH,
    email: EMAIL,
    invitedById: ADMIN_ID,
    expiresAt: EXPIRES_AT,
    usedAt: null,
    createdAt: NOW,
    ...overrides,
  }
}

// Creating and listing read the first four repository functions: the others stay unused.
// Every dependency succeeds by default: a new address, one older link replaced.
// Each test breaks only the one it is about.
function makeDeps() {
  return {
    repository: {
      hasUserWithEmail: vi.fn<InvitationsRepository['hasUserWithEmail']>().mockResolvedValue(false),
      deleteUnusedByEmail: vi
        .fn<InvitationsRepository['deleteUnusedByEmail']>()
        .mockResolvedValue(1),
      create: vi.fn<InvitationsRepository['create']>().mockResolvedValue(invitationRecord()),
      findAll: vi.fn<InvitationsRepository['findAll']>().mockResolvedValue([]),
      findByTokenHash: vi.fn<InvitationsRepository['findByTokenHash']>(),
      createUser: vi.fn<InvitationsRepository['createUser']>(),
      markUsed: vi.fn<InvitationsRepository['markUsed']>(),
    },
    generateToken: vi.fn<InvitationsServiceDeps['generateToken']>().mockReturnValue(TOKEN),
    hashToken: vi.fn<InvitationsServiceDeps['hashToken']>().mockReturnValue(TOKEN_HASH),
    hashPassword: vi.fn<InvitationsServiceDeps['hashPassword']>(),
    avatarUrl: vi.fn<InvitationsServiceDeps['avatarUrl']>(),
    now: vi.fn<InvitationsServiceDeps['now']>().mockReturnValue(NOW),
    logger: {
      info: vi.fn<Logger['info']>(),
      warn: vi.fn<Logger['warn']>(),
      error: vi.fn<Logger['error']>(),
    },
  }
}

describe('createInvitation', () => {
  it('stores the hash of a new token for the normalized email, valid 7 days', async () => {
    const deps = makeDeps()

    const result = await createInvitationsService(deps).createInvitation({
      email: '  Mamie@Example.FR ',
      invitedById: ADMIN_ID,
    })

    expect(deps.repository.hasUserWithEmail).toHaveBeenCalledWith(EMAIL)
    expect(deps.repository.deleteUnusedByEmail).toHaveBeenCalledWith(EMAIL)
    expect(deps.hashToken).toHaveBeenCalledWith(TOKEN)
    expect(deps.repository.create).toHaveBeenCalledWith({
      tokenHash: TOKEN_HASH,
      email: EMAIL,
      invitedById: ADMIN_ID,
      expiresAt: EXPIRES_AT,
    })
    expect(result).toEqual({
      invitation: {
        id: '6b044f9d56a44767c7079d01',
        email: EMAIL,
        status: 'pending',
        createdAt: NOW.toISOString(),
        expiresAt: EXPIRES_AT.toISOString(),
      },
      token: TOKEN,
    })
  })

  it.each([
    ['a number', 42],
    ['an empty string', ''],
    ['blanks only', '   '],
    ['no @', 'pas-un-email'],
    ['a space inside', 'a b@c.d'],
  ])('rejects %s with EMAIL_INVALID and writes nothing', async (_label, email) => {
    const deps = makeDeps()

    await expect(
      createInvitationsService(deps).createInvitation({ email, invitedById: ADMIN_ID }),
    ).rejects.toMatchObject({ code: 'EMAIL_INVALID' })
    expect(deps.repository.deleteUnusedByEmail).not.toHaveBeenCalled()
    expect(deps.repository.create).not.toHaveBeenCalled()
  })

  it('rejects an email that already has an account before touching the invitations', async () => {
    const deps = makeDeps()
    deps.repository.hasUserWithEmail.mockResolvedValue(true)

    await expect(
      createInvitationsService(deps).createInvitation({ email: EMAIL, invitedById: ADMIN_ID }),
    ).rejects.toMatchObject({ code: 'ACCOUNT_EXISTS' })
    expect(deps.repository.deleteUnusedByEmail).not.toHaveBeenCalled()
    expect(deps.repository.create).not.toHaveBeenCalled()
  })

  it('logs ids and the replaced count, never the email or the token', async () => {
    const deps = makeDeps()

    await createInvitationsService(deps).createInvitation({ email: EMAIL, invitedById: ADMIN_ID })

    expect(deps.logger.info).toHaveBeenCalledWith('invitation.created', {
      invitationId: '6b044f9d56a44767c7079d01',
      userId: ADMIN_ID,
      replacedCount: 1,
    })
    const logged = JSON.stringify(deps.logger.info.mock.calls)
    expect(logged).not.toContain(EMAIL)
    expect(logged).not.toContain(TOKEN)
  })
})

describe('listInvitations', () => {
  it('marks a used invitation used, even past its end', async () => {
    const deps = makeDeps()
    const usedAt = new Date('2026-11-20T10:00:00Z')
    deps.repository.findAll.mockResolvedValue([invitationRecord({ usedAt, expiresAt: NOW })])

    const [invitation] = await createInvitationsService(deps).listInvitations()

    expect(invitation.status).toBe('used')
  })

  it('marks an unused invitation expired once its end is reached', async () => {
    const deps = makeDeps()
    deps.repository.findAll.mockResolvedValue([invitationRecord({ expiresAt: NOW })])

    const [invitation] = await createInvitationsService(deps).listInvitations()

    expect(invitation.status).toBe('expired')
  })

  it('marks an unused invitation before its end pending, without its token hash', async () => {
    const deps = makeDeps()
    deps.repository.findAll.mockResolvedValue([invitationRecord()])

    const invitations = await createInvitationsService(deps).listInvitations()

    expect(invitations).toEqual([
      {
        id: '6b044f9d56a44767c7079d01',
        email: EMAIL,
        status: 'pending',
        createdAt: NOW.toISOString(),
        expiresAt: EXPIRES_AT.toISOString(),
      },
    ])
  })
})
