import type { Request, Response } from 'express'
import { readSessionToken } from '../../lib/session-token.js'
import { clearSessionCookie, setSessionCookie } from './auth.cookie.js'
import { currentUser } from './auth.guard.js'
import type { AuthService } from './auth.service.js'

export type AuthController = {
  login: (req: Request, res: Response) => Promise<void>
  logout: (req: Request, res: Response) => Promise<void>
  me: (req: Request, res: Response) => void
}

export function createAuthController(service: AuthService): AuthController {
  return {
    async login(req, res) {
      const { user, token, expiresAt } = await service.login({
        email: req.body?.email,
        password: req.body?.password,
      })
      setSessionCookie(res, token, expiresAt)
      res.json({ user })
    },

    async logout(req, res) {
      await service.logout(readSessionToken(req.headers.cookie))
      clearSessionCookie(res)
      res.status(204).end()
    },

    me(req, res) {
      res.json({ user: currentUser(req) })
    },
  }
}
