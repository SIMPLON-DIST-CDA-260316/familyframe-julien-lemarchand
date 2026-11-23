import type { Photo as PhotoRow } from '@prisma/client'
import { type Response, Router } from 'express'
import multer from 'multer'
import { uploadImage } from './cloudinary.js'
import { prisma } from './db.js'
import { toFrameJpeg } from './image.js'
import type { ApiError, ApiErrorCode, Photo } from './types.js'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const MAX_NICKNAME_LENGTH = 30
const MAX_PHOTOS = 20 // latest photos returned by GET (pagination in J5)
const ALLOWED_TYPES: string[] = ['image/jpeg', 'image/png', 'image/webp']

// Keep the file in memory (req.file.buffer): it goes to sharp, never to disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
})

export function sendError(res: Response, status: number, code: ApiErrorCode): void {
  const body: ApiError = { error: code }
  res.status(status).json(body)
}

// Database row → DTO: publicId stays on the server.
function toPhotoDto(row: PhotoRow): Photo {
  return {
    id: row.id,
    url: row.url,
    nickname: row.nickname,
    createdAt: row.createdAt.toISOString(),
  }
}

export function createPhotosRouter(): Router {
  const router = Router()

  router.get('/', async (_req, res) => {
    const rows = await prisma.photo.findMany({ orderBy: { createdAt: 'desc' }, take: MAX_PHOTOS })
    res.json(rows.map(toPhotoDto))
  })

  router.post('/', upload.single('photo'), async (req, res) => {
    // req.body is filled by multer with the text fields of the form.
    const rawNickname: unknown = req.body?.nickname
    const nickname = typeof rawNickname === 'string' ? rawNickname.trim() : ''
    if (nickname.length === 0 || nickname.length > MAX_NICKNAME_LENGTH) {
      sendError(res, 400, 'NICKNAME_INVALID')
      return
    }

    if (!req.file) {
      sendError(res, 400, 'PHOTO_MISSING')
      return
    }

    // First filter on the mimetype declared by the browser (it can lie: sharp does the real check).
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

    // Cloudinary or database errors go to the error handler in index.ts (500).
    const image = await uploadImage(jpeg)
    let row: PhotoRow
    try {
      row = await prisma.photo.create({ data: { ...image, nickname } })
    } catch (error) {
      console.error(`Photo saved on Cloudinary but not in the database: ${image.publicId}`)
      throw error
    }

    res.status(201).json(toPhotoDto(row))
  })

  return router
}
