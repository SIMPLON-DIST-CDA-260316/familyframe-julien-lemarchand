import express, { Router } from 'express'
import type { CollectionsController } from './collections.controller.js'

export function createCollectionsRouter(controller: CollectionsController): Router {
  const router = Router()
  // A JSON route brings its own parser (see the logging spec).
  router.use(express.json())
  router.get('/', controller.list)
  router.post('/', controller.create)
  router.patch('/:id', controller.rename)
  router.delete('/:id', controller.remove)
  // PUT, not POST: adding the same photo twice leaves the collection as it was.
  router.put('/:id/photos/:photoId', controller.addPhoto)
  router.delete('/:id/photos/:photoId', controller.removePhoto)
  // Several photos at once, from the library picker: one request, one change announced.
  router.post('/:id/photos', controller.addPhotos)
  return router
}
