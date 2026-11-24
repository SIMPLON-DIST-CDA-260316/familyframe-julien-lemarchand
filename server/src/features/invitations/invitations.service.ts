import { AppError } from '../../errors/app-error.js'
import type { Logger } from '../../lib/logger.js'
import type { CreatedInvitation, Invitation, InvitationStatus } from '../../types.js'
import type { InvitationRecord, InvitationsRepository } from './invitations.repository.js'

const DAY_MS = 24 * 60 * 60 * 1000
export const INVITATION_DURATION_MS = 7 * DAY_MS
// Loose on purpose: the admin types the address himself; this catches a missing @ or a
// stray space without rejecting a real address.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/

// email comes straight from the JSON body: validated here, at the boundary.
export type NewInvitationInput = { email: unknown; invitedById: string }

export type InvitationsServiceDeps = {
  repository: InvitationsRepository
  generateToken: () => string
  hashToken: (token: string) => string
  now: () => Date
  logger: Logger
}

export type InvitationsService = {
  createInvitation: (input: NewInvitationInput) => Promise<CreatedInvitation>
  listInvitations: () => Promise<Invitation[]>
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

export function createInvitationsService(deps: InvitationsServiceDeps): InvitationsService {
  return {
    createInvitation: (input) => createInvitation(deps, input),
    listInvitations: () => listInvitations(deps),
  }
}
