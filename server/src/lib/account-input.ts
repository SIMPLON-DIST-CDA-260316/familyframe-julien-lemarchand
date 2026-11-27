import { AppError } from '../errors/app-error.js'

// Shown on frames and next to shared photos: a bound keeps the layout.
export const DISPLAY_NAME_MAX_LENGTH = 50
// OWASP ASVS: at least 12, allow up to 128; the maximum keeps argon2 away from huge inputs.
export const PASSWORD_MIN_LENGTH = 12
export const PASSWORD_MAX_LENGTH = 128

// The same rules when an invitation creates the account and when its owner edits it.
export function parseDisplayName(displayName: unknown): string {
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
export function parsePassword(password: unknown): string {
  if (
    typeof password !== 'string' ||
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH
  ) {
    throw new AppError('PASSWORD_INVALID')
  }
  return password
}
