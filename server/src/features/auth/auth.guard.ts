import type { Request } from 'express'
import { AppError } from '../../errors/app-error.js'
import { logger } from '../../lib/logger.js'
import type { PublicUser, UserRole } from '../../types.js'

// Only req.user is read: the unit test passes a plain object instead of an Express request.
type RequestWithUser = Pick<Request, 'user'>

// Narrower than RequestHandler, which it still satisfies wherever Express expects one.
export type RoleGuard = (req: RequestWithUser, res: unknown, next: () => void) => void

// For handlers behind requireAuth: fails loudly if one is mounted without it.
export function currentUser(req: RequestWithUser): PublicUser {
  if (!req.user) {
    throw new AppError('UNAUTHENTICATED')
  }
  return req.user
}

// Mounted after requireAuth: the role comes from the session it already loaded, no extra query.
export function requireRole(role: UserRole): RoleGuard {
  return (req, _res, next) => {
    const user = currentUser(req)
    if (user.role !== role) {
      logger.warn('auth.forbidden', { userId: user.id })
      throw new AppError('FORBIDDEN')
    }
    next()
  }
}
