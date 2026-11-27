import type { Request, Response } from 'express'
import type { Selection } from '../../types.js'
import { currentUser } from '../auth/auth.guard.js'
import type { SelectionsService } from './selections.service.js'

export type SelectionsController = {
  daily: (req: Request, res: Response) => Promise<void>
  radio: (req: Request<{ photoId: string }>, res: Response) => Promise<void>
}

async function daily(service: SelectionsService, req: Request, res: Response): Promise<void> {
  const body: Selection = await service.dailySelection(currentUser(req).id)
  res.json(body)
}

async function radio(
  service: SelectionsService,
  req: Request<{ photoId: string }>,
  res: Response,
): Promise<void> {
  const ownerId = currentUser(req).id
  const body: Selection = await service.radioSelection({ ownerId, photoId: req.params.photoId })
  res.json(body)
}

export function createSelectionsController(service: SelectionsService): SelectionsController {
  return {
    daily: (req, res) => daily(service, req, res),
    radio: (req, res) => radio(service, req, res),
  }
}
