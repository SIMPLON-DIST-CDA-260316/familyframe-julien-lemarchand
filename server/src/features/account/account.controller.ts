import type { Request, Response } from 'express'
import { currentSessionId, currentUser } from '../auth/auth.guard.js'
import type { AccountService } from './account.service.js'

export type AccountController = {
  changeDisplayName: (req: Request, res: Response) => Promise<void>
  changePassword: (req: Request, res: Response) => Promise<void>
  changeAvatar: (req: Request, res: Response) => Promise<void>
  removeAvatar: (req: Request, res: Response) => Promise<void>
}

// Every route edits the logged-in account: the id comes from the session, never from the URL.
export function createAccountController(service: AccountService): AccountController {
  return {
    async changeDisplayName(req, res) {
      const user = await service.changeDisplayName({
        userId: currentUser(req).id,
        displayName: req.body?.displayName,
      })
      res.json({ user })
    },
    // 204: the cookie of this request stays valid, nothing to send back.
    async changePassword(req, res) {
      await service.changePassword({
        userId: currentUser(req).id,
        sessionId: currentSessionId(req),
        currentPassword: req.body?.currentPassword,
        newPassword: req.body?.newPassword,
      })
      res.status(204).end()
    },
    async changeAvatar(req, res) {
      const user = await service.changeAvatar({ userId: currentUser(req).id, file: req.file })
      res.json({ user })
    },
    async removeAvatar(req, res) {
      const user = await service.removeAvatar(currentUser(req).id)
      res.json({ user })
    },
  }
}
