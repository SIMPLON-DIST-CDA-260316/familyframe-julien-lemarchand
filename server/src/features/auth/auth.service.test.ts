import { describe, expect, it, vi } from 'vitest'
import type { Logger } from '../../lib/logger.js'
import type { AuthRepository, SessionWithUser, UserRecord } from './auth.repository.js'
import { type AuthServiceDeps, createAuthService } from './auth.service.js'

const NOW = new Date('2026-11-23T10:00:00Z')
const DAY_MS = 24 * 60 * 60 * 1000
const SESSION_END = new Date(NOW.getTime() + 90 * DAY_MS)
const TOKEN = 'a'.repeat(64)
const TOKEN_HASH = 'b'.repeat(64)
const USER: UserRecord = {
  id: '6b044f9d56a44767c7079b01',
  email: 'membre@familyframe.test',
  displayName: 'Membre',
  passwordHash: '$argon2id$stored-hash',
  role: 'member',
  avatarCloudinaryId: null,
  createdAt: new Date('2026-11-01T10:00:00Z'),
}
const PUBLIC_USER = {
  id: USER.id,
  email: 'membre@familyframe.test',
  displayName: 'Membre',
  role: 'member',
  avatarUrl: null,
}
const CREDENTIALS = { email: 'membre@familyframe.test', password: 'secret' }

function sessionExpiringIn(remainingMs: number): SessionWithUser {
  return {
    id: '6b044f9d56a44767c7079c01',
    tokenHash: TOKEN_HASH,
    userId: USER.id,
    expiresAt: new Date(NOW.getTime() + remainingMs),
    createdAt: new Date('2026-11-01T10:00:00Z'),
    user: USER,
  }
}

// Every dependency succeeds by default: a known user, the right password, a session
// with 60 days left. Each test breaks only the one it is about.
function makeDeps() {
  return {
    repository: {
      findUserByEmail: vi.fn<AuthRepository['findUserByEmail']>().mockResolvedValue(USER),
      findSessionByTokenHash: vi
        .fn<AuthRepository['findSessionByTokenHash']>()
        .mockResolvedValue(sessionExpiringIn(60 * DAY_MS)),
      createSession: vi.fn<AuthRepository['createSession']>().mockResolvedValue(undefined),
      extendSession: vi.fn<AuthRepository['extendSession']>().mockResolvedValue(undefined),
      deleteSession: vi.fn<AuthRepository['deleteSession']>().mockResolvedValue(undefined),
      deleteExpiredSessions: vi
        .fn<AuthRepository['deleteExpiredSessions']>()
        .mockResolvedValue(undefined),
    },
    hashToken: vi.fn<AuthServiceDeps['hashToken']>().mockReturnValue(TOKEN_HASH),
    generateToken: vi.fn<AuthServiceDeps['generateToken']>().mockReturnValue(TOKEN),
    verifyPassword: vi.fn<AuthServiceDeps['verifyPassword']>().mockResolvedValue(true),
    avatarUrl: vi.fn<AuthServiceDeps['avatarUrl']>(
      (cloudinaryId) => `https://cdn.test/${cloudinaryId}`,
    ),
    now: vi.fn<AuthServiceDeps['now']>().mockReturnValue(NOW),
    logger: {
      info: vi.fn<Logger['info']>(),
      warn: vi.fn<Logger['warn']>(),
      error: vi.fn<Logger['error']>(),
    },
  }
}

describe('login', () => {
  it('opens a 90-day session for the normalized email and returns the public user', async () => {
    const deps = makeDeps()

    const result = await createAuthService(deps).login({
      email: '  Membre@FamilyFrame.TEST ',
      password: 'secret',
    })

    expect(result).toEqual({ user: PUBLIC_USER, token: TOKEN, expiresAt: SESSION_END })
    expect(deps.repository.findUserByEmail).toHaveBeenCalledWith('membre@familyframe.test')
    expect(deps.verifyPassword).toHaveBeenCalledWith(USER.passwordHash, 'secret')
    expect(deps.hashToken).toHaveBeenCalledWith(TOKEN)
    expect(deps.repository.createSession).toHaveBeenCalledWith({
      tokenHash: TOKEN_HASH,
      userId: USER.id,
      expiresAt: SESSION_END,
    })
  })

  it('purges the expired sessions at each successful login', async () => {
    const deps = makeDeps()

    await createAuthService(deps).login(CREDENTIALS)

    expect(deps.repository.deleteExpiredSessions).toHaveBeenCalledWith(NOW)
  })

  it('logs the login by user id, never by email', async () => {
    const deps = makeDeps()

    await createAuthService(deps).login(CREDENTIALS)

    expect(deps.logger.info).toHaveBeenCalledWith('auth.login_succeeded', { userId: USER.id })
    expect(JSON.stringify(deps.logger.info.mock.calls)).not.toContain('familyframe.test')
  })

  it('rejects an unknown email after verifying a password all the same', async () => {
    const deps = makeDeps()
    deps.repository.findUserByEmail.mockResolvedValue(null)
    deps.verifyPassword.mockResolvedValue(false)

    await expect(createAuthService(deps).login(CREDENTIALS)).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    })
    expect(deps.verifyPassword).toHaveBeenCalledTimes(1)
    expect(deps.verifyPassword).toHaveBeenCalledWith(
      expect.stringMatching(/^\$argon2id\$/),
      'secret',
    )
    expect(deps.repository.createSession).not.toHaveBeenCalled()
  })

  it('rejects a wrong password without opening a session', async () => {
    const deps = makeDeps()
    deps.verifyPassword.mockResolvedValue(false)

    await expect(createAuthService(deps).login(CREDENTIALS)).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    })
    expect(deps.repository.createSession).not.toHaveBeenCalled()
    expect(deps.repository.deleteExpiredSessions).not.toHaveBeenCalled()
  })

  it('logs a failed login without any data', async () => {
    const deps = makeDeps()
    deps.verifyPassword.mockResolvedValue(false)

    await expect(createAuthService(deps).login(CREDENTIALS)).rejects.toThrow()
    expect(deps.logger.warn).toHaveBeenCalledWith('auth.login_failed')
    expect(deps.logger.warn.mock.calls[0]).toHaveLength(1)
  })

  it.each([
    ['a missing email', { password: 'secret' }],
    ['an empty email', { email: '', password: 'secret' }],
    ['an email that is not a string', { email: 42, password: 'secret' }],
    ['a missing password', { email: 'membre@familyframe.test' }],
    ['an empty password', { email: 'membre@familyframe.test', password: '' }],
  ])('rejects %s before looking up the user', async (_label, credentials) => {
    const deps = makeDeps()

    await expect(
      createAuthService(deps).login({ email: undefined, password: undefined, ...credentials }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
    expect(deps.repository.findUserByEmail).not.toHaveBeenCalled()
  })
})

describe('openSession', () => {
  it('purges the expired sessions, then stores the hash of a new 90-day session', async () => {
    const deps = makeDeps()

    const session = await createAuthService(deps).openSession(USER.id)

    expect(deps.repository.deleteExpiredSessions).toHaveBeenCalledWith(NOW)
    expect(deps.repository.createSession).toHaveBeenCalledWith({
      tokenHash: TOKEN_HASH,
      userId: USER.id,
      expiresAt: SESSION_END,
    })
    expect(session).toEqual({ token: TOKEN, expiresAt: SESSION_END })
  })
})

describe('logout', () => {
  it('deletes the session of the token and logs the user id', async () => {
    const deps = makeDeps()

    await createAuthService(deps).logout(TOKEN)

    expect(deps.hashToken).toHaveBeenCalledWith(TOKEN)
    expect(deps.repository.deleteSession).toHaveBeenCalledWith('6b044f9d56a44767c7079c01')
    expect(deps.logger.info).toHaveBeenCalledWith('auth.logged_out', { userId: USER.id })
  })

  it('does nothing without a token', async () => {
    const deps = makeDeps()

    await createAuthService(deps).logout(null)

    expect(deps.repository.findSessionByTokenHash).not.toHaveBeenCalled()
  })

  it('does nothing for an unknown token', async () => {
    const deps = makeDeps()
    deps.repository.findSessionByTokenHash.mockResolvedValue(null)

    await createAuthService(deps).logout(TOKEN)

    expect(deps.repository.deleteSession).not.toHaveBeenCalled()
    expect(deps.logger.info).not.toHaveBeenCalled()
  })
})

describe('authenticate', () => {
  it('rejects a missing token without querying the database', async () => {
    const deps = makeDeps()

    await expect(createAuthService(deps).authenticate(null)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    })
    expect(deps.repository.findSessionByTokenHash).not.toHaveBeenCalled()
  })

  it('rejects an unknown token', async () => {
    const deps = makeDeps()
    deps.repository.findSessionByTokenHash.mockResolvedValue(null)

    await expect(createAuthService(deps).authenticate(TOKEN)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    })
    expect(deps.repository.findSessionByTokenHash).toHaveBeenCalledWith(TOKEN_HASH)
  })

  it('rejects an expired session and deletes it', async () => {
    const deps = makeDeps()
    deps.repository.findSessionByTokenHash.mockResolvedValue(sessionExpiringIn(-1))

    await expect(createAuthService(deps).authenticate(TOKEN)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    })
    expect(deps.repository.deleteSession).toHaveBeenCalledWith('6b044f9d56a44767c7079c01')
  })

  it('returns the public user, the session id and the session end', async () => {
    const deps = makeDeps()
    const session = sessionExpiringIn(60 * DAY_MS)
    deps.repository.findSessionByTokenHash.mockResolvedValue(session)

    await expect(createAuthService(deps).authenticate(TOKEN)).resolves.toEqual({
      user: PUBLIC_USER,
      sessionId: '6b044f9d56a44767c7079c01',
      expiresAt: session.expiresAt,
      isRenewed: false,
    })
  })

  it('never extends a session, even close to its end', async () => {
    const deps = makeDeps()
    deps.repository.findSessionByTokenHash.mockResolvedValue(sessionExpiringIn(10 * DAY_MS))

    await createAuthService(deps).authenticate(TOKEN)

    expect(deps.repository.extendSession).not.toHaveBeenCalled()
  })
})

describe('authenticateAndSlide', () => {
  it('keeps a session with 45 days or more left as it is', async () => {
    const deps = makeDeps()
    deps.repository.findSessionByTokenHash.mockResolvedValue(sessionExpiringIn(45 * DAY_MS))

    const result = await createAuthService(deps).authenticateAndSlide(TOKEN)

    expect(result.isRenewed).toBe(false)
    expect(deps.repository.extendSession).not.toHaveBeenCalled()
  })

  it('extends a session with less than 45 days left to 90 days from now', async () => {
    const deps = makeDeps()
    deps.repository.findSessionByTokenHash.mockResolvedValue(sessionExpiringIn(44 * DAY_MS))

    const result = await createAuthService(deps).authenticateAndSlide(TOKEN)

    expect(result).toEqual({
      user: PUBLIC_USER,
      sessionId: '6b044f9d56a44767c7079c01',
      expiresAt: SESSION_END,
      isRenewed: true,
    })
    expect(deps.repository.extendSession).toHaveBeenCalledWith(
      '6b044f9d56a44767c7079c01',
      SESSION_END,
    )
  })

  it('rejects an expired session like authenticate', async () => {
    const deps = makeDeps()
    deps.repository.findSessionByTokenHash.mockResolvedValue(sessionExpiringIn(-1))

    await expect(createAuthService(deps).authenticateAndSlide(TOKEN)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    })
    expect(deps.repository.extendSession).not.toHaveBeenCalled()
  })
})
