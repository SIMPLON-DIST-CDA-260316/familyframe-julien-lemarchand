import express, { type RequestHandler, Router } from 'express'
import type { AuthController } from './auth.controller.js'

export function createAuthRouter(controller: AuthController, requireAuth: RequestHandler): Router {
  const router = Router()
  // The only routes that read JSON: the parser stays here (see the logging spec).
  router.use(express.json())
  router.post('/login', controller.login)
  router.post('/logout', controller.logout)
  router.get('/me', requireAuth, controller.me)
  return router
}
