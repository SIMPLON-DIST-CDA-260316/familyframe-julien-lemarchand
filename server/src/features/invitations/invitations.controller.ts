import type { Request, Response } from 'express'
import { currentUser } from '../auth/auth.guard.js'
import type { InvitationsService } from './invitations.service.js'

export type InvitationsController = {
  create: (req: Request, res: Response) => Promise<void>
  list: (req: Request, res: Response) => Promise<void>
}

export function createInvitationsController(service: InvitationsService): InvitationsController {
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
  }
}
