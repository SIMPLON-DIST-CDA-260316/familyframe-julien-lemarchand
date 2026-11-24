import type { Request, Response } from 'express'
import { currentUser } from '../auth/auth.guard.js'
import type { FriendshipsService } from './friendships.service.js'

export type FriendshipsController = {
  list: (req: Request, res: Response) => Promise<void>
  request: (req: Request, res: Response) => Promise<void>
  accept: (req: Request<{ id: string }>, res: Response) => Promise<void>
  remove: (req: Request<{ id: string }>, res: Response) => Promise<void>
}

export function createFriendshipsController(service: FriendshipsService): FriendshipsController {
  return {
    async list(req, res) {
      const list = await service.listFriendships(currentUser(req).id)
      res.json(list)
    },
    async request(req, res) {
      const friendship = await service.requestFriendship({
        email: req.body?.email,
        requesterId: currentUser(req).id,
      })
      res.status(201).json({ friendship })
    },
    async accept(req, res) {
      const friendship = await service.acceptFriendship({
        id: req.params.id,
        userId: currentUser(req).id,
      })
      res.json({ friendship })
    },
    async remove(req, res) {
      await service.deleteFriendship({ id: req.params.id, userId: currentUser(req).id })
      res.status(204).end()
    },
  }
}
