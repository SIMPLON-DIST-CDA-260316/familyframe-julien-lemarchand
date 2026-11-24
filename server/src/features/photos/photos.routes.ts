import express, { Router } from 'express'
import type { PhotosController } from './photos.controller.js'
import { upload } from './photos.upload.js'

export function createPhotosRouter(controller: PhotosController): Router {
  const router = Router()
  router.get('/', controller.list)
  router.post('/', upload.single('photo'), controller.create)
  router.post('/share', upload.single('photo'), controller.shareFromDevice)
  router.delete('/:id', controller.remove)
  // A JSON route brings its own parser (see the logging spec): the others are multipart.
  router.post('/:id/share', express.json(), controller.shareFromLibrary)
  return router
}
