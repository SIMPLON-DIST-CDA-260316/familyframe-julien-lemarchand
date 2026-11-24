import type { Request, Response } from 'express'
import { deliveryUrls } from '../../lib/cloudinary.js'
import type { SocketServer } from '../../lib/socket-types.js'
import type { Photo, PhotoPage } from '../../types.js'
import { currentUser } from '../auth/auth.middleware.js'
import { userRoom } from '../auth/auth.socket.js'
import type { PhotoRecord } from './photos.repository.js'
import type { PhotosService } from './photos.service.js'

export type PhotosController = {
  list: (req: Request, res: Response) => Promise<void>
  create: (req: Request, res: Response) => Promise<void>
  remove: (req: Request<{ id: string }>, res: Response) => Promise<void>
}

// cloudinaryId and ownerId stay on the server: the client gets ready-made URLs.
function toPhotoDto(record: PhotoRecord): Photo {
  return {
    id: record.id,
    ...deliveryUrls(record.cloudinaryId),
    createdAt: record.createdAt.toISOString(),
  }
}

export function createPhotosController(service: PhotosService, io: SocketServer): PhotosController {
  return {
    async list(req, res) {
      const { records, nextCursor } = await service.listPage({
        ownerId: currentUser(req).id,
        cursor: req.query.cursor,
        limit: req.query.limit,
      })
      const page: PhotoPage = { photos: records.map(toPhotoDto), nextCursor }
      res.json(page)
    },

    async create(req, res) {
      const ownerId = currentUser(req).id
      const record = await service.createPhoto({ ownerId, file: req.file })
      const photo = toPhotoDto(record)
      // Only the owner's frames and pages: other accounts never see the photo.
      io.to(userRoom(ownerId)).emit('photo:new', photo)
      res.status(201).json(photo)
    },

    async remove(req, res) {
      const ownerId = currentUser(req).id
      const deletedId = await service.deletePhoto({ ownerId, id: req.params.id })
      io.to(userRoom(ownerId)).emit('photo:deleted', deletedId)
      res.status(204).end()
    },
  }
}
