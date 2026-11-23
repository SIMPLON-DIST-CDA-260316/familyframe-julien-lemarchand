import { AppError } from '../../errors/app-error.js'
import type { Logger } from '../../lib/logger.js'
import { DUMMY_PASSWORD_HASH } from '../../lib/password.js'
import type { PublicUser } from '../../types.js'
import type { AuthRepository, SessionWithUser, UserRecord } from './auth.repository.js'

const DAY_MS = 24 * 60 * 60 * 1000
const SESSION_DURATION_MS = 90 * DAY_MS
// Below this, an authenticated request extends the session: a frame in use never logs out,
// with at most one database write every 45 days.
const RENEWAL_THRESHOLD_MS = 45 * DAY_MS

export type Credentials = { email: unknown; password: unknown }

export type LoginResult = { user: PublicUser; token: string; expiresAt: Date }

export type AuthenticatedSession = { user: PublicUser; expiresAt: Date; isRenewed: boolean }

export type AuthServiceDeps = {
  repository: AuthRepository
  hashToken: (token: string) => string
  generateToken: () => string
  verifyPassword: (passwordHash: string, plain: string) => Promise<boolean>
  now: () => Date
  logger: Logger
}

export type AuthService = {
  login: (credentials: Credentials) => Promise<LoginResult>
  logout: (token: string | null) => Promise<void>
  authenticate: (token: string | null) => Promise<AuthenticatedSession>
  authenticateAndSlide: (token: string | null) => Promise<AuthenticatedSession>
}

// The password hash never leaves the service.
function toPublicUser({ id, email, displayName, role }: UserRecord): PublicUser {
  return { id, email, displayName, role }
}

function isFilledString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function sessionEnd({ now }: AuthServiceDeps): Date {
  return new Date(now().getTime() + SESSION_DURATION_MS)
}

async function findUserByCredentials(
  { repository, verifyPassword, logger }: AuthServiceDeps,
  { email, password }: Credentials,
): Promise<UserRecord> {
  if (!isFilledString(email) || !isFilledString(password)) {
    throw new AppError('INVALID_CREDENTIALS')
  }
  const user = await repository.findUserByEmail(email.trim().toLowerCase())
  // Always one verification: an unknown email takes as long as a wrong password.
  const isPasswordValid = await verifyPassword(user?.passwordHash ?? DUMMY_PASSWORD_HASH, password)
  if (!user || !isPasswordValid) {
    // No data: the email is personal, and the same body for both cases avoids account enumeration.
    logger.warn('auth.login_failed')
    throw new AppError('INVALID_CREDENTIALS')
  }
  return user
}

async function findValidSession(
  { repository, hashToken, now }: AuthServiceDeps,
  token: string | null,
): Promise<SessionWithUser> {
  if (token === null) {
    throw new AppError('UNAUTHENTICATED')
  }
  const session = await repository.findSessionByTokenHash(hashToken(token))
  if (!session) {
    throw new AppError('UNAUTHENTICATED')
  }
  // Prisma 6 cannot declare a MongoDB TTL index: an expired session is deleted when read.
  if (session.expiresAt <= now()) {
    await repository.deleteSession(session.id)
    throw new AppError('UNAUTHENTICATED')
  }
  return session
}

async function login(deps: AuthServiceDeps, credentials: Credentials): Promise<LoginResult> {
  const { repository, hashToken, generateToken, now, logger } = deps
  const user = await findUserByCredentials(deps, credentials)
  await repository.deleteExpiredSessions(now())
  const token = generateToken()
  const expiresAt = sessionEnd(deps)
  await repository.createSession({ tokenHash: hashToken(token), userId: user.id, expiresAt })
  logger.info('auth.login_succeeded', { userId: user.id })
  return { user: toPublicUser(user), token, expiresAt }
}

// Idempotent: logging out without a session, or twice, is not an error.
async function logout(
  { repository, hashToken, logger }: AuthServiceDeps,
  token: string | null,
): Promise<void> {
  if (token === null) {
    return
  }
  const session = await repository.findSessionByTokenHash(hashToken(token))
  if (!session) {
    return
  }
  await repository.deleteSession(session.id)
  logger.info('auth.logged_out', { userId: session.userId })
}

async function authenticate(
  deps: AuthServiceDeps,
  token: string | null,
): Promise<AuthenticatedSession> {
  const session = await findValidSession(deps, token)
  return { user: toPublicUser(session.user), expiresAt: session.expiresAt, isRenewed: false }
}

async function authenticateAndSlide(
  deps: AuthServiceDeps,
  token: string | null,
): Promise<AuthenticatedSession> {
  const session = await findValidSession(deps, token)
  const remainingMs = session.expiresAt.getTime() - deps.now().getTime()
  if (remainingMs >= RENEWAL_THRESHOLD_MS) {
    return { user: toPublicUser(session.user), expiresAt: session.expiresAt, isRenewed: false }
  }
  const expiresAt = sessionEnd(deps)
  await deps.repository.extendSession(session.id, expiresAt)
  return { user: toPublicUser(session.user), expiresAt, isRenewed: true }
}

export function createAuthService(deps: AuthServiceDeps): AuthService {
  return {
    login: (credentials) => login(deps, credentials),
    logout: (token) => logout(deps, token),
    authenticate: (token) => authenticate(deps, token),
    authenticateAndSlide: (token) => authenticateAndSlide(deps, token),
  }
}
