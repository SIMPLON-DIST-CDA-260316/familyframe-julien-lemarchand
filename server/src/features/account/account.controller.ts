import type { Request, Response } from 'express'
import { currentUser } from '../auth/auth.guard.js'
import type { AccountService } from './account.service.js'

export type AccountController = {
  changeDisplayName: (req: Request, res: Response) => Promise<void>
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
  }
}
