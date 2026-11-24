import express, { Router } from 'express'
import type { FriendshipsController } from './friendships.controller.js'

export function createFriendshipsRouter(controller: FriendshipsController): Router {
  const router = Router()
  // A JSON route brings its own parser (see the logging spec).
  router.use(express.json())
  router.get('/', controller.list)
  router.post('/', controller.request)
  router.delete('/:id', controller.remove)
  return router
}
