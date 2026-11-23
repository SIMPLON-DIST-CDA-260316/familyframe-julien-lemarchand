import cors from 'cors'
import express, { type Express } from 'express'
import type { Server } from 'socket.io'
import { config } from './config.js'
import { errorHandler } from './errors/error-handler.js'
import { notFound } from './errors/not-found.js'
import { createPhotosRepository } from './features/photos/photos.repository.js'
import { createPhotosService } from './features/photos/photos.service.js'
import { uploadImage } from './lib/cloudinary.js'
import { prisma } from './lib/db.js'
import { toFrameJpeg } from './lib/image.js'
import { createPhotosRouter } from './photos.js'
import type { ClientToServerEvents, ServerToClientEvents } from './types.js'

export function createApp(io: Server<ClientToServerEvents, ServerToClientEvents>): Express {
  const app = express()

  app.use(cors({ origin: config.clientOrigin }))
  app.use(express.json())

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  const repository = createPhotosRepository(prisma)
  const service = createPhotosService({ repository, toFrameJpeg, uploadImage })

  app.use('/api/photos', createPhotosRouter(io, service))

  app.use(notFound)
  app.use(errorHandler)

  return app
}
