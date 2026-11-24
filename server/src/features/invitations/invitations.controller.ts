import type { Request, Response } from 'express'
import { setSessionCookie } from '../auth/auth.cookie.js'
import { currentUser } from '../auth/auth.guard.js'
import type { AuthService } from '../auth/auth.service.js'
import type { InvitationsService } from './invitations.service.js'

export type InvitationsController = {
  create: (req: Request, res: Response) => Promise<void>
  list: (req: Request, res: Response) => Promise<void>
  accept: (req: Request, res: Response) => Promise<void>
}

export function createInvitationsController(
  service: InvitationsService,
  authService: AuthService,
): InvitationsController {
  return {
    async create(req, res) {
      const created = await service.createInvitation({
        email: req.body?.email,
        invitedById: currentUser(req).id,
      })
      res.status(201).json(created)
    },

    async list(_req, res) {
      const invitations = await service.listInvitations()
      res.json({ invitations })
    },

    // The new member lands logged in, with the same cookie as after /login.
    async accept(req, res) {
      const user = await service.acceptInvitation({
        token: req.body?.token,
        displayName: req.body?.displayName,
        password: req.body?.password,
      })
      const { token, expiresAt } = await authService.openSession(user.id)
      setSessionCookie(res, token, expiresAt)
      res.status(201).json({ user })
    },
  }
}
