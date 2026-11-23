import cors from 'cors'
import express, { type Express, type NextFunction, type Request, type Response } from 'express'
import multer from 'multer'
import type { Server } from 'socket.io'
import { config } from './config.js'
import { createPhotosRouter, sendError } from './photos.js'
import type { ClientToServerEvents, ServerToClientEvents } from './types.js'

// What the API does: middlewares, routes, errors. No port, no process handling (see server.ts).
export function createApp(io: Server<ClientToServerEvents, ServerToClientEvents>): Express {
  const app = express()

  app.use(cors({ origin: config.clientOrigin }))
  app.use(express.json())

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.use('/api/photos', createPhotosRouter(io))

  // Error handler (4 arguments): Express 5 sends here the errors thrown by async routes.
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        sendError(res, 413, 'PHOTO_TOO_LARGE')
      } else {
        sendError(res, 400, 'UPLOAD_INVALID')
      }
      return
    }
    console.error(error)
    sendError(res, 500, 'SERVER_ERROR')
  })

  return app
}
