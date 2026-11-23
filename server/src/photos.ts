import type { Photo as PhotoRow } from '@prisma/client'
import { type Response, Router } from 'express'
import multer from 'multer'
import type { Server } from 'socket.io'
import { uploadImage } from './cloudinary.js'
import { prisma } from './db.js'
import { toFrameJpeg } from './image.js'
import type {
  ApiError,
  ApiErrorCode,
  ClientToServerEvents,
  Photo,
  ServerToClientEvents,
} from './types.js'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_UPLOADER_NAME_LENGTH = 30
const MAX_PHOTOS = 20
const ALLOWED_TYPES: string[] = ['image/jpeg', 'image/png', 'image/webp']

// In memory: the file goes to sharp, never to disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
})

export function sendError(res: Response, status: number, code: ApiErrorCode): void {
  const body: ApiError = { error: code }
  res.status(status).json(body)
}

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
      sendError(res, 400, 'UPLOADER_NAME_INVALID')
      return
    }

    if (!req.file) {
      sendError(res, 400, 'PHOTO_MISSING')
      return
    }

    // Cheap first filter: the browser's mimetype can lie, sharp checks for real.
    if (!ALLOWED_TYPES.includes(req.file.mimetype)) {
      sendError(res, 415, 'FORMAT_UNSUPPORTED')
      return
    }

    let jpeg: Buffer
    try {
      jpeg = await toFrameJpeg(req.file.buffer)
    } catch {
      sendError(res, 422, 'IMAGE_UNREADABLE')
      return
    }

    // Cloudinary or database errors reach the error handler in app.ts.
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
