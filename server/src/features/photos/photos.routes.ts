import { Router } from 'express'
import type { PhotosController } from './photos.controller.js'
import { upload } from './photos.upload.js'

export function createPhotosRouter(controller: PhotosController): Router {
  const router = Router()
  router.get('/', controller.list)
  router.post('/', upload.single('photo'), controller.create)
  return router
}
