import type { RequestHandler } from 'express'
import { AppError } from '../../errors/app-error.js'
import { readSessionToken } from '../../lib/session-token.js'
import type { PublicUser } from '../../types.js'
import { setSessionCookie } from './auth.cookie.js'
import type { AuthService } from './auth.service.js'

// Declaration merging: every Express handler sees req.user and req.sessionId typed, without casts.
declare global {
  namespace Express {
    interface Request {
      user?: PublicUser
      sessionId?: string
    }
  }
}

export function createRequireAuth(service: AuthService): RequestHandler {
  return async (req, res, next) => {
    const token = readSessionToken(req.headers.cookie)
    if (token === null) {
      throw new AppError('UNAUTHENTICATED')
    }
    const { user, sessionId, expiresAt, isRenewed } = await service.authenticateAndSlide(token)
    if (isRenewed) {
      setSessionCookie(res, token, expiresAt)
    }
    req.user = user
    req.sessionId = sessionId
    next()
  }
}
