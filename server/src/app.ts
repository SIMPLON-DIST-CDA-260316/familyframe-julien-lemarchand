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
import { createCollectionsController } from './features/collections/collections.controller.js'
import { createCollectionsRepository } from './features/collections/collections.repository.js'
import { createCollectionsRouter } from './features/collections/collections.routes.js'
import { createCollectionsService } from './features/collections/collections.service.js'
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
import { createSelectionsController } from './features/selections/selections.controller.js'
import { createSelectionsRepository } from './features/selections/selections.repository.js'
import { createSelectionsRouter } from './features/selections/selections.routes.js'
import { createSelectionsService } from './features/selections/selections.service.js'
import { createSendsController } from './features/sends/sends.controller.js'
import { createSendsRepository } from './features/sends/sends.repository.js'
import { createSendsRouter } from './features/sends/sends.routes.js'
import { createSendsService } from './features/sends/sends.service.js'
import {
  avatarUrl,
  deleteImage,
  thumbnailUrl,
  uploadAvatar,
  uploadImage,
} from './lib/cloudinary.js'
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
    recordSend: createSendsRepository(prisma).create,
    logger,
  })
  return createPhotosRouter(createPhotosController(service, io))
}

function assembleSendsRouter(): Router {
  const service = createSendsService({
    repository: createSendsRepository(prisma),
    deleteImage,
    logger,
  })
  return createSendsRouter(createSendsController(service))
}

function assembleCollectionsRouter(io: SocketServer): Router {
  const service = createCollectionsService({
    repository: createCollectionsRepository(prisma),
    logger,
    thumbnailUrl,
  })
  return createCollectionsRouter(createCollectionsController(service, io))
}

function assembleSelectionsRouter(): Router {
  const service = createSelectionsService({
    repository: createSelectionsRepository(prisma),
    now: () => new Date(),
  })
  return createSelectionsRouter(createSelectionsController(service))
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
  app.use('/api/collections', requireAuth, assembleCollectionsRouter(io))
  app.use('/api/selections', requireAuth, assembleSelectionsRouter())
  app.use('/api/sends', requireAuth, assembleSendsRouter())

  app.use(notFound)
  app.use(errorHandler)

  return app
}
