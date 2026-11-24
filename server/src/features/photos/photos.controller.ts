import type { Request, Response } from 'express'
import { deliveryUrls } from '../../lib/cloudinary.js'
import type { SocketServer } from '../../lib/socket-types.js'
import type { Photo, PhotoPage } from '../../types.js'
import { currentUser } from '../auth/auth.guard.js'
import { userRoom } from '../auth/auth.socket.js'
import type { PhotoRecord } from './photos.repository.js'
import type { PhotosService } from './photos.service.js'

export type PhotosController = {
  list: (req: Request, res: Response) => Promise<void>
  create: (req: Request, res: Response) => Promise<void>
  remove: (req: Request<{ id: string }>, res: Response) => Promise<void>
  shareFromLibrary: (req: Request<{ id: string }>, res: Response) => Promise<void>
}

type ControllerDeps = { service: PhotosService; io: SocketServer }

// cloudinaryId, ownerId and senderId stay on the server: the client gets ready-made URLs
// and the sender's name.
function toPhotoDto(record: PhotoRecord): Photo {
  return {
    id: record.id,
    ...deliveryUrls(record.cloudinaryId),
    createdAt: record.createdAt.toISOString(),
    senderName: record.sender?.displayName ?? null,
  }
}

// Only the owner's frames and pages: other accounts never see the photo.
function announceNewPhoto({ io }: ControllerDeps, res: Response, record: PhotoRecord): void {
  const photo = toPhotoDto(record)
  io.to(userRoom(record.ownerId)).emit('photo:new', photo)
  res.status(201).json(photo)
}

async function list({ service }: ControllerDeps, req: Request, res: Response): Promise<void> {
  const { records, nextCursor } = await service.listPage({
    ownerId: currentUser(req).id,
    cursor: req.query.cursor,
    limit: req.query.limit,
  })
  const page: PhotoPage = { photos: records.map(toPhotoDto), nextCursor }
  res.json(page)
}

async function create(deps: ControllerDeps, req: Request, res: Response): Promise<void> {
  const record = await deps.service.createPhoto({ ownerId: currentUser(req).id, file: req.file })
  announceNewPhoto(deps, res, record)
}

async function remove(
  { service, io }: ControllerDeps,
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> {
  const ownerId = currentUser(req).id
  const deletedId = await service.deletePhoto({ ownerId, id: req.params.id })
  io.to(userRoom(ownerId)).emit('photo:deleted', deletedId)
  res.status(204).end()
}

// The new photo is the friend's: it goes to their room, the sender's library does not change.
async function shareFromLibrary(
  deps: ControllerDeps,
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> {
  const record = await deps.service.shareFromLibrary({
    senderId: currentUser(req).id,
    photoId: req.params.id,
    friendId: req.body?.friendId,
  })
  announceNewPhoto(deps, res, record)
}

export function createPhotosController(service: PhotosService, io: SocketServer): PhotosController {
  const deps: ControllerDeps = { service, io }
  return {
    list: (req, res) => list(deps, req, res),
    create: (req, res) => create(deps, req, res),
    remove: (req, res) => remove(deps, req, res),
    shareFromLibrary: (req, res) => shareFromLibrary(deps, req, res),
  }
}
