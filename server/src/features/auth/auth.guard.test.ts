import { afterEach, describe, expect, it, type Mock, vi } from 'vitest'
import { logger } from '../../lib/logger.js'
import type { PublicUser } from '../../types.js'
import { requireRole } from './auth.guard.js'

const ADMIN: PublicUser = {
  id: '6b044f9d56a44767c7079b01',
  email: 'admin@familyframe.test',
  displayName: 'Admin',
  role: 'admin',
}
const MEMBER: PublicUser = {
  id: '6b044f9d56a44767c7079b02',
  email: 'membre@familyframe.test',
  displayName: 'Membre',
  role: 'member',
}

// The guard only reads req.user: a plain object stands in for the Express request.
function runAdminGuard(
  user: PublicUser | undefined,
  next: Mock<() => void> = vi.fn<() => void>(),
): Mock<() => void> {
  requireRole('admin')({ user }, undefined, next)
  return next
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('requireRole', () => {
  it('lets an admin through to the next handler', () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {})

    const next = runAdminGuard(ADMIN)

    expect(next).toHaveBeenCalledWith()
    expect(warn).not.toHaveBeenCalled()
  })

  it('refuses a member with FORBIDDEN and logs the user id only', () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {})

    const next = vi.fn<() => void>()

    expect(() => runAdminGuard(MEMBER, next)).toThrow(
      expect.objectContaining({ code: 'FORBIDDEN' }),
    )
    expect(next).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledWith('auth.forbidden', { userId: MEMBER.id })
  })

  it('refuses a request without a user with UNAUTHENTICATED', () => {
    expect(() => runAdminGuard(undefined)).toThrow(
      expect.objectContaining({ code: 'UNAUTHENTICATED' }),
    )
  })
})
