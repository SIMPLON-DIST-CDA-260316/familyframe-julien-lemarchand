import { Router } from 'express'
import type { Server } from 'socket.io'
import type { PhotoRecord } from './features/photos/photos.repository.js'
import type { PhotosService } from './features/photos/photos.service.js'
import { upload } from './features/photos/photos.upload.js'
import type { ClientToServerEvents, Photo, ServerToClientEvents } from './types.js'

// cloudinaryId stays on the server.
function toPhotoDto(record: PhotoRecord): Photo {
  return {
    id: record.id,
    url: record.url,
    uploaderName: record.uploaderName,
    createdAt: record.createdAt.toISOString(),
  }
}

export function createPhotosRouter(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  service: PhotosService,
): Router {
  const router = Router()

  router.get('/', async (_req, res) => {
    const records = await service.listLatest()
    res.json(records.map(toPhotoDto))
  })

  router.post('/', upload.single('photo'), async (req, res) => {
    const record = await service.createPhoto({
      uploaderName: req.body?.uploaderName,
      file: req.file,
    })
    const photo = toPhotoDto(record)
    io.emit('photo:new', photo)
    res.status(201).json(photo)
  })

  return router
}
