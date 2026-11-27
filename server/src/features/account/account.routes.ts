import express, { Router } from 'express'
import { upload } from '../photos/photos.upload.js'
import type { AccountController } from './account.controller.js'

// app.ts mounts the router behind requireAuth: every route acts on the logged-in account.
export function createAccountRouter(controller: AccountController): Router {
  const router = Router()
  // A JSON route brings its own parser (see the logging spec).
  router.patch('/', express.json(), controller.changeDisplayName)
  router.put('/password', express.json(), controller.changePassword)
  // The photo upload's Multer settings: in memory, 10 MB, one file.
  router.put('/avatar', upload.single('avatar'), controller.changeAvatar)
  router.delete('/avatar', controller.removeAvatar)
  return router
}
