import { AppError } from '../../errors/app-error.js'
import type { Logger } from '../../lib/logger.js'
import type { CreatedInvitation, Invitation, InvitationStatus, PublicUser } from '../../types.js'
import type {
  InvitationRecord,
  InvitationsRepository,
  UserRecord,
} from './invitations.repository.js'

const DAY_MS = 24 * 60 * 60 * 1000
export const INVITATION_DURATION_MS = 7 * DAY_MS
// Loose on purpose: the admin types the address himself; this catches a missing @ or a
// stray space without rejecting a real address.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/
// What generateToken produces: 32 random bytes in hex.
const TOKEN_PATTERN = /^[0-9a-f]{64}$/
// Shown on frames and next to shared photos: a bound keeps the layout.
export const DISPLAY_NAME_MAX_LENGTH = 50
// OWASP ASVS: at least 12, allow up to 128; the maximum keeps argon2 away from huge inputs.
export const PASSWORD_MIN_LENGTH = 12
export const PASSWORD_MAX_LENGTH = 128

// email comes straight from the JSON body: validated here, at the boundary.
export type NewInvitationInput = { email: unknown; invitedById: string }

// The three fields come straight from the JSON body, like email above.
export type InvitationAcceptance = { token: unknown; displayName: unknown; password: unknown }

export type InvitationsServiceDeps = {
  repository: InvitationsRepository
  generateToken: () => string
  hashToken: (token: string) => string
  hashPassword: (plain: string) => Promise<string>
  now: () => Date
  logger: Logger
}

export type InvitationsService = {
  createInvitation: (input: NewInvitationInput) => Promise<CreatedInvitation>
  listInvitations: () => Promise<Invitation[]>
  acceptInvitation: (acceptance: InvitationAcceptance) => Promise<PublicUser>
}

// Same normalization as login: the account created from the invitation logs in with it.
function parseEmail(email: unknown): string {
  if (typeof email !== 'string') {
    throw new AppError('EMAIL_INVALID')
  }
  const normalizedEmail = email.trim().toLowerCase()
  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    throw new AppError('EMAIL_INVALID')
  }
  return normalizedEmail
}

function parseDisplayName(displayName: unknown): string {
  if (typeof displayName !== 'string') {
    throw new AppError('DISPLAY_NAME_INVALID')
  }
  const trimmedName = displayName.trim()
  if (trimmedName.length === 0 || trimmedName.length > DISPLAY_NAME_MAX_LENGTH) {
    throw new AppError('DISPLAY_NAME_INVALID')
  }
  return trimmedName
}

// Not trimmed: a space is a character the person chose.
function parsePassword(password: unknown): string {
  if (
    typeof password !== 'string' ||
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH
  ) {
    throw new AppError('PASSWORD_INVALID')
  }
  return password
}

// Used comes first: the admin learns the person signed up, even after the 7 days.
function statusOf({ usedAt, expiresAt }: InvitationRecord, now: Date): InvitationStatus {
  if (usedAt !== null) {
    return 'used'
  }
  return expiresAt <= now ? 'expired' : 'pending'
}

// tokenHash and invitedById stay on the server.
function toInvitation(record: InvitationRecord, now: Date): Invitation {
  return {
    id: record.id,
    email: record.email,
    status: statusOf(record, now),
    createdAt: record.createdAt.toISOString(),
    expiresAt: record.expiresAt.toISOString(),
  }
}

// The password hash never leaves the service.
function toPublicUser({ id, email, displayName, role }: UserRecord): PublicUser {
  return { id, email, displayName, role }
}

async function createInvitation(
  { repository, generateToken, hashToken, now, logger }: InvitationsServiceDeps,
  { email, invitedById }: NewInvitationInput,
): Promise<CreatedInvitation> {
  const normalizedEmail = parseEmail(email)
  // An admin route: telling him which addresses have an account leaks nothing to a stranger.
  if (await repository.hasUserWithEmail(normalizedEmail)) {
    throw new AppError('ACCOUNT_EXISTS')
  }
  // A new link replaces any unused one: "I lost the link" needs no revoke button.
  const replacedCount = await repository.deleteUnusedByEmail(normalizedEmail)
  const token = generateToken()
  const createdAt = now()
  const record = await repository.create({
    tokenHash: hashToken(token),
    email: normalizedEmail,
    invitedById,
    expiresAt: new Date(createdAt.getTime() + INVITATION_DURATION_MS),
  })
  logger.info('invitation.created', { invitationId: record.id, userId: invitedById, replacedCount })
  return { invitation: toInvitation(record, createdAt), token }
}

async function listInvitations({ repository, now }: InvitationsServiceDeps): Promise<Invitation[]> {
  const records = await repository.findAll()
  const listedAt = now()
  return records.map((record) => toInvitation(record, listedAt))
}

// Logs ids and a reason only: never the token, the email, the name or the password.
async function findLiveInvitation(
  { repository, hashToken, now, logger }: InvitationsServiceDeps,
  token: unknown,
): Promise<InvitationRecord> {
  // Cannot match any stored hash: answered without a lookup.
  if (typeof token !== 'string' || !TOKEN_PATTERN.test(token)) {
    throw new AppError('INVITATION_NOT_FOUND')
  }
  const invitation = await repository.findByTokenHash(hashToken(token))
  if (!invitation) {
    logger.warn('invitation.accept_failed', { reason: 'not_found' })
    throw new AppError('INVITATION_NOT_FOUND')
  }
  // Before expiry: "log in" is the right advice for someone who already signed up.
  if (invitation.usedAt !== null) {
    logger.warn('invitation.accept_failed', { reason: 'used', invitationId: invitation.id })
    throw new AppError('INVITATION_USED')
  }
  if (invitation.expiresAt <= now()) {
    logger.warn('invitation.accept_failed', { reason: 'expired', invitationId: invitation.id })
    throw new AppError('INVITATION_EXPIRED')
  }
  return invitation
}

async function acceptInvitation(
  deps: InvitationsServiceDeps,
  acceptance: InvitationAcceptance,
): Promise<PublicUser> {
  const { repository, hashPassword, now, logger } = deps
  // The link first: no point choosing a password for a dead one.
  const invitation = await findLiveInvitation(deps, acceptance.token)
  const displayName = parseDisplayName(acceptance.displayName)
  const passwordHash = await hashPassword(parsePassword(acceptance.password))
  // No transaction: the unique index on User.email lets one of two concurrent accepts through.
  const user = await repository.createUser({ email: invitation.email, displayName, passwordHash })
  if (!user) {
    logger.warn('invitation.accept_failed', {
      reason: 'account_exists',
      invitationId: invitation.id,
    })
    throw new AppError('ACCOUNT_EXISTS')
  }
  await repository.markUsed(invitation.id, now())
  logger.info('invitation.accepted', { invitationId: invitation.id, userId: user.id })
  return toPublicUser(user)
}

export function createInvitationsService(deps: InvitationsServiceDeps): InvitationsService {
  return {
    createInvitation: (input) => createInvitation(deps, input),
    listInvitations: () => listInvitations(deps),
    acceptInvitation: (acceptance) => acceptInvitation(deps, acceptance),
  }
}
