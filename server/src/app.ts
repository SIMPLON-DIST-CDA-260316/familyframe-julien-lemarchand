import cors from 'cors'
import express, { type Express, type Router } from 'express'
import type { Server } from 'socket.io'
import { config } from './config.js'
import { errorHandler } from './errors/error-handler.js'
import { notFound } from './errors/not-found.js'
import { createAuthController } from './features/auth/auth.controller.js'
import { createRequireAuth } from './features/auth/auth.middleware.js'
import { createAuthRepository } from './features/auth/auth.repository.js'
import { createAuthRouter } from './features/auth/auth.routes.js'
import { type AuthService, createAuthService } from './features/auth/auth.service.js'
import { createPhotosController } from './features/photos/photos.controller.js'
import { createPhotosRepository } from './features/photos/photos.repository.js'
import { createPhotosRouter } from './features/photos/photos.routes.js'
import { createPhotosService } from './features/photos/photos.service.js'
import { deleteImage, uploadImage } from './lib/cloudinary.js'
import { prisma } from './lib/db.js'
import { toFrameJpeg } from './lib/image.js'
import { logger } from './lib/logger.js'
import { verifyPassword } from './lib/password.js'
import { requestLogger } from './lib/request-logger.js'
import { generateToken, hashToken } from './lib/session-token.js'
import type { ClientToServerEvents, ServerToClientEvents } from './types.js'

// Built outside createApp: server.ts also hands it to the Socket.IO middleware.
export function assembleAuthService(): AuthService {
  return createAuthService({
    repository: createAuthRepository(prisma),
    hashToken,
    generateToken,
    verifyPassword,
    now: () => new Date(),
    logger,
  })
}

function assemblePhotosRouter(io: Server<ClientToServerEvents, ServerToClientEvents>): Router {
  const service = createPhotosService({
    repository: createPhotosRepository(prisma),
    toFrameJpeg,
    uploadImage,
    deleteImage,
    logger,
  })
  return createPhotosRouter(createPhotosController(service, io))
}

export function createApp(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  authService: AuthService,
): Express {
  const requireAuth = createRequireAuth(authService)
  const app = express()

  // First, so every request is timed and logged, 404s included.
  app.use(requestLogger)
  app.use(cors({ origin: config.clientOrigin }))

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.use('/api/auth', createAuthRouter(createAuthController(authService), requireAuth))
  app.use('/api/photos', assemblePhotosRouter(io))

  app.use(notFound)
  app.use(errorHandler)

  return app
}
