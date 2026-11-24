import cors from 'cors'
import express, { type Express, type RequestHandler, type Router } from 'express'
import { config } from './config.js'
import { errorHandler } from './errors/error-handler.js'
import { notFound } from './errors/not-found.js'
import { createAccountController } from './features/account/account.controller.js'
import { createAccountRepository } from './features/account/account.repository.js'
import { createAccountRouter } from './features/account/account.routes.js'
import { createAccountService } from './features/account/account.service.js'
import { createAuthController } from './features/auth/auth.controller.js'
import { requireRole } from './features/auth/auth.guard.js'
import { createRequireAuth } from './features/auth/auth.middleware.js'
import { createAuthRepository } from './features/auth/auth.repository.js'
import { createAuthRouter } from './features/auth/auth.routes.js'
import { type AuthService, createAuthService } from './features/auth/auth.service.js'
import { createFriendshipsController } from './features/friendships/friendships.controller.js'
import { createFriendshipsRepository } from './features/friendships/friendships.repository.js'
import { createFriendshipsRouter } from './features/friendships/friendships.routes.js'
import {
  createFriendshipsService,
  type FriendshipsService,
} from './features/friendships/friendships.service.js'
import { createInvitationsController } from './features/invitations/invitations.controller.js'
import { createInvitationsRepository } from './features/invitations/invitations.repository.js'
import { createInvitationsRouter } from './features/invitations/invitations.routes.js'
import { createInvitationsService } from './features/invitations/invitations.service.js'
import { createPhotosController } from './features/photos/photos.controller.js'
import { createPhotosRepository } from './features/photos/photos.repository.js'
import { createPhotosRouter } from './features/photos/photos.routes.js'
import { createPhotosService, type PhotosServiceDeps } from './features/photos/photos.service.js'
import { avatarUrl, deleteImage, uploadAvatar, uploadImage } from './lib/cloudinary.js'
import { prisma } from './lib/db.js'
import { toAvatarJpeg, toFrameJpeg } from './lib/image.js'
import { logger } from './lib/logger.js'
import { hashPassword, verifyPassword } from './lib/password.js'
import { requestLogger } from './lib/request-logger.js'
import { generateToken, hashToken } from './lib/session-token.js'
import type { SocketServer } from './lib/socket-types.js'

// Built outside createApp: server.ts also hands it to the Socket.IO middleware.
export function assembleAuthService(): AuthService {
  return createAuthService({
    repository: createAuthRepository(prisma),
    hashToken,
    generateToken,
    verifyPassword,
    avatarUrl,
    now: () => new Date(),
    logger,
  })
}

function assemblePhotosRouter(
  io: SocketServer,
  areFriends: PhotosServiceDeps['areFriends'],
): Router {
  const service = createPhotosService({
    repository: createPhotosRepository(prisma),
    toFrameJpeg,
    uploadImage,
    deleteImage,
    areFriends,
    logger,
  })
  return createPhotosRouter(createPhotosController(service, io))
}

function assembleFriendshipsService(): FriendshipsService {
  return createFriendshipsService({
    repository: createFriendshipsRepository(prisma),
    avatarUrl,
    logger,
  })
}

function assembleFriendshipsRouter(service: FriendshipsService): Router {
  return createFriendshipsRouter(createFriendshipsController(service))
}

function assembleAccountRouter(): Router {
  const service = createAccountService({
    repository: createAccountRepository(prisma),
    hashPassword,
    verifyPassword,
    toAvatarJpeg,
    uploadAvatar,
    deleteImage,
    avatarUrl,
    logger,
  })
  return createAccountRouter(createAccountController(service))
}

function assembleInvitationsRouter(
  authService: AuthService,
  requireAuth: RequestHandler,
  requireAdmin: RequestHandler,
): Router {
  const service = createInvitationsService({
    repository: createInvitationsRepository(prisma),
    generateToken,
    hashToken,
    hashPassword,
    avatarUrl,
    now: () => new Date(),
    logger,
  })
  const controller = createInvitationsController(service, authService)
  return createInvitationsRouter(controller, requireAuth, requireAdmin)
}

export function createApp(io: SocketServer, authService: AuthService): Express {
  const requireAuth = createRequireAuth(authService)
  const requireAdmin = requireRole('admin')
  // One instance for both routers: the photos service asks it who is friends.
  const friendships = assembleFriendshipsService()
  const app = express()

  // First, so every request is timed and logged, 404s included.
  app.use(requestLogger)
  app.use(cors({ origin: config.clientOrigin }))

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.use('/api/auth', createAuthRouter(createAuthController(authService), requireAuth))
  app.use('/api/photos', requireAuth, assemblePhotosRouter(io, friendships.areFriends))
  // Unlike photos, the router gets requireAuth itself: its accept route is public.
  app.use('/api/invitations', assembleInvitationsRouter(authService, requireAuth, requireAdmin))
  app.use('/api/friendships', requireAuth, assembleFriendshipsRouter(friendships))
  app.use('/api/account', requireAuth, assembleAccountRouter())

  app.use(notFound)
  app.use(errorHandler)

  return app
}
