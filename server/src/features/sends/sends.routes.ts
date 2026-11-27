import { Router } from 'express'
import type { SendsController } from './sends.controller.js'

// No body on either route: no JSON parser.
export function createSendsRouter(controller: SendsController): Router {
  const router = Router()
  router.get('/', controller.list)
  router.delete('/:id', controller.remove)
  return router
}
