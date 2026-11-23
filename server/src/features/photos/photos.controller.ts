import type { Request, Response } from 'express'
import { deliveryUrls } from '../../lib/cloudinary.js'
import type { SocketServer } from '../../lib/socket-types.js'
import type { Photo } from '../../types.js'
import { currentUser } from '../auth/auth.middleware.js'
import type { PhotoRecord } from './photos.repository.js'
import type { PhotosService } from './photos.service.js'

export type PhotosController = {
  list: (req: Request, res: Response) => Promise<void>
  create: (req: Request, res: Response) => Promise<void>
  remove: (req: Request<{ id: string }>, res: Response) => Promise<void>
}

// cloudinaryId stays on the server: the client gets ready-made URLs.
function toPhotoDto(record: PhotoRecord): Photo {
  return {
    id: record.id,
    ...deliveryUrls(record.cloudinaryId),
    uploaderName: record.uploaderName,
    createdAt: record.createdAt.toISOString(),
  }
}

export function createPhotosController(service: PhotosService, io: SocketServer): PhotosController {
  return {
    async list(_req, res) {
      const records = await service.listLatest()
      res.json(records.map(toPhotoDto))
    },

    async create(req, res) {
      const record = await service.createPhoto({
        uploaderName: currentUser(req).displayName,
        file: req.file,
      })
      const photo = toPhotoDto(record)
      io.emit('photo:new', photo)
      res.status(201).json(photo)
    },

    async remove(req, res) {
      const deletedId = await service.deletePhoto(req.params.id)
      io.emit('photo:deleted', deletedId)
      res.status(204).end()
    },
  }
}
