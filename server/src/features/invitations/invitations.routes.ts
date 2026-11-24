import express, { type RequestHandler, Router } from 'express'
import type { InvitationsController } from './invitations.controller.js'

export function createInvitationsRouter(
  controller: InvitationsController,
  requireAuth: RequestHandler,
  requireAdmin: RequestHandler,
): Router {
  const router = Router()
  // A JSON route brings its own parser (see the logging spec).
  router.use(express.json())
  router.get('/', requireAuth, requireAdmin, controller.list)
  router.post('/', requireAuth, requireAdmin, controller.create)
  return router
}
