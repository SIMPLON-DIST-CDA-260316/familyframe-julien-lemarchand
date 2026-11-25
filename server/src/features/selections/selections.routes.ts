import { Router } from 'express'
import type { SelectionsController } from './selections.controller.js'

// Reads only: no JSON body to parse.
export function createSelectionsRouter(controller: SelectionsController): Router {
  const router = Router()
  router.get('/daily', controller.daily)
  return router
}
