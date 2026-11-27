import type { Request, Response } from 'express'
import type { SocketServer } from '../../lib/socket-types.js'
import type { CollectionList } from '../../types.js'
import { currentUser } from '../auth/auth.guard.js'
import { userRoom } from '../auth/auth.socket.js'
import type { CollectionsService } from './collections.service.js'

export type CollectionsController = {
  list: (req: Request, res: Response) => Promise<void>
  create: (req: Request, res: Response) => Promise<void>
  rename: (req: Request<{ id: string }>, res: Response) => Promise<void>
  remove: (req: Request<{ id: string }>, res: Response) => Promise<void>
  addPhoto: (req: Request<MembershipParams>, res: Response) => Promise<void>
  addPhotos: (req: Request<{ id: string }>, res: Response) => Promise<void>
  removePhoto: (req: Request<MembershipParams>, res: Response) => Promise<void>
}

type MembershipParams = { id: string; photoId: string }

type ControllerDeps = { service: CollectionsService; io: SocketServer }

// Every page of the owner reloads its list: menus, cards and frames stay in step.
function announceChange({ io }: ControllerDeps, ownerId: string): void {
  io.to(userRoom(ownerId)).emit('collections:changed')
}

async function list({ service }: ControllerDeps, req: Request, res: Response): Promise<void> {
  const collections = await service.listCollections(currentUser(req).id)
  const body: CollectionList = { collections }
  res.json(body)
}

async function create(deps: ControllerDeps, req: Request, res: Response): Promise<void> {
  const ownerId = currentUser(req).id
  const collection = await deps.service.createCollection({ ownerId, name: req.body?.name })
  announceChange(deps, ownerId)
  res.status(201).json(collection)
}

async function rename(
  deps: ControllerDeps,
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> {
  const ownerId = currentUser(req).id
  const collection = await deps.service.renameCollection({
    id: req.params.id,
    ownerId,
    name: req.body?.name,
  })
  announceChange(deps, ownerId)
  res.json(collection)
}

async function remove(
  deps: ControllerDeps,
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> {
  const ownerId = currentUser(req).id
  await deps.service.deleteCollection({ id: req.params.id, ownerId })
  announceChange(deps, ownerId)
  res.status(204).end()
}

async function addPhoto(
  deps: ControllerDeps,
  req: Request<MembershipParams>,
  res: Response,
): Promise<void> {
  const ownerId = currentUser(req).id
  const { id, photoId } = req.params
  const collection = await deps.service.addPhoto({ id, ownerId, photoId })
  announceChange(deps, ownerId)
  res.json(collection)
}

async function addPhotos(
  deps: ControllerDeps,
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> {
  const ownerId = currentUser(req).id
  const collection = await deps.service.addPhotos({
    id: req.params.id,
    ownerId,
    photoIds: req.body?.photoIds,
  })
  announceChange(deps, ownerId)
  res.json(collection)
}

async function removePhoto(
  deps: ControllerDeps,
  req: Request<MembershipParams>,
  res: Response,
): Promise<void> {
  const ownerId = currentUser(req).id
  const { id, photoId } = req.params
  const collection = await deps.service.removePhoto({ id, ownerId, photoId })
  announceChange(deps, ownerId)
  res.json(collection)
}

export function createCollectionsController(
  service: CollectionsService,
  io: SocketServer,
): CollectionsController {
  const deps: ControllerDeps = { service, io }
  return {
    list: (req, res) => list(deps, req, res),
    create: (req, res) => create(deps, req, res),
    rename: (req, res) => rename(deps, req, res),
    remove: (req, res) => remove(deps, req, res),
    addPhoto: (req, res) => addPhoto(deps, req, res),
    addPhotos: (req, res) => addPhotos(deps, req, res),
    removePhoto: (req, res) => removePhoto(deps, req, res),
  }
}
