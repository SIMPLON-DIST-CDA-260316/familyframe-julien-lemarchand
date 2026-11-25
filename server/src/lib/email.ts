import { AppError } from '../errors/app-error.js'

// Loose on purpose: a person types the address; this catches a missing @ or a stray space
// without rejecting a real address.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/

// Same normalization as login: an invitation and a friend request both name the address an
// account logs in with.
export function parseEmail(email: unknown): string {
  if (typeof email !== 'string') {
    throw new AppError('EMAIL_INVALID')
  }
  const normalizedEmail = email.trim().toLowerCase()
  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    throw new AppError('EMAIL_INVALID')
  }
  return normalizedEmail
}
