import type { Request, Response } from 'express'
import type { SendPage } from '../../types.js'
import { currentUser } from '../auth/auth.guard.js'
import { toSentPhotoDto } from './sends.dto.js'
import type { SendsService } from './sends.service.js'

export type SendsController = {
  list: (req: Request, res: Response) => Promise<void>
  remove: (req: Request<{ id: string }>, res: Response) => Promise<void>
}

async function list(service: SendsService, req: Request, res: Response): Promise<void> {
  const { records, nextCursor } = await service.listPage({
    senderId: currentUser(req).id,
    cursor: req.query.cursor,
    limit: req.query.limit,
  })
  const page: SendPage = { sends: records.map(toSentPhotoDto), nextCursor }
  res.json(page)
}

// No socket event: the history is the sender's alone, and the page that removed it updates itself.
async function remove(
  service: SendsService,
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> {
  await service.deleteSend({ id: req.params.id, senderId: currentUser(req).id })
  res.status(204).end()
}

export function createSendsController(service: SendsService): SendsController {
  return {
    list: (req, res) => list(service, req, res),
    remove: (req, res) => remove(service, req, res),
  }
}
