import type { Request, Response } from 'express'
import { deliveryUrls } from '../../lib/cloudinary.js'
import type { SocketServer } from '../../lib/socket-types.js'
import type { Photo, PhotoPage, UnopenedPhotos } from '../../types.js'
import { currentUser } from '../auth/auth.guard.js'
import { userRoom } from '../auth/auth.socket.js'
import type { PhotoRecord } from './photos.repository.js'
import type { PhotosService } from './photos.service.js'

export type PhotosController = {
  list: (req: Request, res: Response) => Promise<void>
  create: (req: Request, res: Response) => Promise<void>
  remove: (req: Request<{ id: string }>, res: Response) => Promise<void>
  listUnopened: (req: Request, res: Response) => Promise<void>
  open: (req: Request<{ id: string }>, res: Response) => Promise<void>
  shareFromLibrary: (req: Request<{ id: string }>, res: Response) => Promise<void>
  shareFromDevice: (req: Request, res: Response) => Promise<void>
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
    message: record.message,
  }
}

// Only the owner's frames and pages: other accounts never see the photo.
function announceNewPhoto({ io }: ControllerDeps, res: Response, record: PhotoRecord): void {
  const photo = toPhotoDto(record)
  io.to(userRoom(record.ownerId)).emit('photo:new', photo)
  res.status(201).json(photo)
}

// A shared photo waits unopened: the friend's pages announce it instead of showing it.
function announceReceivedPhoto({ io }: ControllerDeps, res: Response, record: PhotoRecord): void {
  const photo = toPhotoDto(record)
  io.to(userRoom(record.ownerId)).emit('photo:received', photo)
  res.status(201).json(photo)
}

async function list({ service }: ControllerDeps, req: Request, res: Response): Promise<void> {
  const { records, nextCursor } = await service.listPage({
    ownerId: currentUser(req).id,
    cursor: req.query.cursor,
    limit: req.query.limit,
    collectionId: req.query.collectionId,
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

async function listUnopened(
  { service }: ControllerDeps,
  req: Request,
  res: Response,
): Promise<void> {
  const records = await service.listUnopened(currentUser(req).id)
  const unopened: UnopenedPhotos = { photos: records.map(toPhotoDto) }
  res.json(unopened)
}

// Every page of the owner learns it: the frame adds it to the slideshow, the counters drop.
async function open(
  { service, io }: ControllerDeps,
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> {
  const ownerId = currentUser(req).id
  const photo = toPhotoDto(await service.openPhoto({ ownerId, id: req.params.id }))
  io.to(userRoom(ownerId)).emit('photo:opened', photo)
  res.json(photo)
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
    message: req.body?.message,
  })
  announceReceivedPhoto(deps, res, record)
}

// multer fills req.body with the text fields: friendId and message are two of them.
async function shareFromDevice(deps: ControllerDeps, req: Request, res: Response): Promise<void> {
  const record = await deps.service.shareFromDevice({
    senderId: currentUser(req).id,
    file: req.file,
    friendId: req.body?.friendId,
    message: req.body?.message,
  })
  announceReceivedPhoto(deps, res, record)
}

export function createPhotosController(service: PhotosService, io: SocketServer): PhotosController {
  const deps: ControllerDeps = { service, io }
  return {
    list: (req, res) => list(deps, req, res),
    create: (req, res) => create(deps, req, res),
    remove: (req, res) => remove(deps, req, res),
    listUnopened: (req, res) => listUnopened(deps, req, res),
    open: (req, res) => open(deps, req, res),
    shareFromLibrary: (req, res) => shareFromLibrary(deps, req, res),
    shareFromDevice: (req, res) => shareFromDevice(deps, req, res),
  }
}
