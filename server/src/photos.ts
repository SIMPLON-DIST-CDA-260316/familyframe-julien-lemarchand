import type { Photo as PhotoRow } from '@prisma/client'
import { Router } from 'express'
import multer from 'multer'
import type { Server } from 'socket.io'
import { uploadImage } from './cloudinary.js'
import { prisma } from './db.js'
import { AppError } from './errors/app-error.js'
import { toFrameJpeg } from './image.js'
import type { ClientToServerEvents, Photo, ServerToClientEvents } from './types.js'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_UPLOADER_NAME_LENGTH = 30
const MAX_PHOTOS = 20
const ALLOWED_TYPES: string[] = ['image/jpeg', 'image/png', 'image/webp']

// In memory: the file goes to sharp, never to disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
})

// cloudinaryId stays on the server.
function toPhotoDto(row: PhotoRow): Photo {
  return {
    id: row.id,
    url: row.url,
    uploaderName: row.uploaderName,
    createdAt: row.createdAt.toISOString(),
  }
}

export function createPhotosRouter(io: Server<ClientToServerEvents, ServerToClientEvents>): Router {
  const router = Router()

  router.get('/', async (_req, res) => {
    const rows = await prisma.photo.findMany({ orderBy: { createdAt: 'desc' }, take: MAX_PHOTOS })
    res.json(rows.map(toPhotoDto))
  })

  router.post('/', upload.single('photo'), async (req, res) => {
    const rawUploaderName: unknown = req.body?.uploaderName
    const uploaderName = typeof rawUploaderName === 'string' ? rawUploaderName.trim() : ''
    if (uploaderName.length === 0 || uploaderName.length > MAX_UPLOADER_NAME_LENGTH) {
      throw new AppError('UPLOADER_NAME_INVALID')
    }

    if (!req.file) {
      throw new AppError('PHOTO_MISSING')
    }

    // Cheap first filter: the browser's mimetype can lie, sharp checks for real.
    if (!ALLOWED_TYPES.includes(req.file.mimetype)) {
      throw new AppError('FORMAT_UNSUPPORTED')
    }

    let jpeg: Buffer
    try {
      jpeg = await toFrameJpeg(req.file.buffer)
    } catch {
      throw new AppError('IMAGE_UNREADABLE')
    }

    // Cloudinary or database errors reach the error handler as 500s.
    const image = await uploadImage(jpeg)
    let row: PhotoRow
    try {
      row = await prisma.photo.create({ data: { ...image, uploaderName } })
    } catch (error) {
      console.error(`Photo saved on Cloudinary but not in the database: ${image.cloudinaryId}`)
      throw error
    }

    const photo = toPhotoDto(row)
    io.emit('photo:new', photo)
    res.status(201).json(photo)
  })

  return router
}
