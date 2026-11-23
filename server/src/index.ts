import { createServer } from 'node:http'
import cors from 'cors'
import express, { type NextFunction, type Request, type Response } from 'express'
import multer from 'multer'
import { Server } from 'socket.io'
import { config } from './config.js'
import { createPhotosRouter, sendError } from './photos.js'
import type { ClientToServerEvents, ServerToClientEvents } from './types.js'

const app = express()
const httpServer = createServer(app)
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: config.clientOrigin },
})

io.on('connection', (socket) => {
  console.log(`socket connected: ${socket.id}`)
})

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

httpServer.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`)
})
